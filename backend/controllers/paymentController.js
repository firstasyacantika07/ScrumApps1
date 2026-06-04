const db = require("../config/db");
const midtransClient = require("midtrans-client");

// ======================================================
// MIDTRANS CONFIG
// ======================================================
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

const coreApi = new midtransClient.CoreApi({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Helper untuk memformat objek Date menjadi format string MySQL (YYYY-MM-DD HH:mm:ss)
const formatToMySQLDateTime = (date) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

// ======================================================
// 1. SNAP PAYMENT (Mendapatkan Token & URL Snap)
// ======================================================
exports.createPayment = async (req, res) => {
  try {
    const { planId, billingCycle } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User tidak terautentikasi",
      });
    }

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Parameter planId wajib disertakan",
      });
    }

    const targetPlanId = Number(planId);

    const [plans] = await db.query(
      `SELECT * FROM tbr_plans WHERE id = ?`,
      [targetPlanId]
    );

    if (!plans || plans.length === 0) {
      return res.status(200).json({
        success: false,
        message: "Paket tidak ditemukan",
      });
    }

    const plan = plans[0];
    const cycle = billingCycle ? billingCycle.toUpperCase() : "MONTHLY";
    
    const amount = cycle === "YEARLY" 
      ? Number(plan.price_yearly) 
      : Number(plan.price_monthly);

    const orderId = `SCRUM-${Date.now()}`;

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: req.user.name || "User",
        email: req.user.email || "user@scrumapps.local",
      },
    };

    const transaction = await snap.createTransaction(parameter);

    await db.query(
      `
      INSERT INTO tbr_payments 
        (user_id, order_id, amount, payment_status, package_type, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
      `,
      [req.user.id, orderId, amount, "PENDING", plan.name]
    );

    return res.status(200).json({
      success: true,
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id: orderId,
    });

  } catch (error) {
    console.error("SNAP PAYMENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal membuat transaksi pembayaran",
      error: error.message,
    });
  }
};

// ======================================================
// 2. CORE API PAYMENT (Direct Charge Method)
// ======================================================
exports.createCheckoutSession = async (req, res) => {
  try {
    const { planId, amount, planName, paymentMethod } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User tidak terautentikasi",
      });
    }

    if (!planId || !amount || !planName || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Plan, amount, planName dan paymentMethod wajib diisi",
      });
    }

    const orderId = `TRX-${Date.now()}`;

    const parameter = {
      payment_type: "",
      transaction_details: {
        order_id: orderId,
        gross_amount: Number(amount),
      },
      item_details: [
        {
          id: String(planId),
          price: Number(amount),
          quantity: 1,
          name: `ScrumApps Premium - ${planName}`,
        },
      ],
      customer_details: {
        first_name: req.user.name || "User",
        email: req.user.email || "user@scrumapps.local",
      },
    };

    if (paymentMethod === "qris") {
      parameter.payment_type = "qris";
      parameter.qris = { acquirer: "gopay" };
    } 
    else if (["bca", "bni", "bri", "permata"].includes(paymentMethod)) {
      parameter.payment_type = "bank_transfer";
      parameter.bank_transfer = { bank: paymentMethod };
    } 
    else if (paymentMethod === "mandiri") {
      parameter.payment_type = "echannel";
      parameter.echannel = {
        bill_info1: "Pembayaran",
        bill_info2: "ScrumApps Premium",
      };
    } 
    else {
      return res.status(400).json({
        success: false,
        message: "Metode pembayaran tidak valid",
      });
    }

    const chargeResponse = await coreApi.charge(parameter);

    await db.query(
      `
      INSERT INTO tbr_payments 
        (user_id, order_id, transaction_id, amount, payment_method, payment_status, package_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        req.user.id,
        orderId,
        chargeResponse.transaction_id || null,
        amount,
        paymentMethod,
        "PENDING",
        planName,
      ]
    );

    return res.status(200).json({
      success: true,
      orderId,
      paymentData: chargeResponse,
    });

  } catch (error) {
    console.error("MIDTRANS CORE API ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memproses transaksi Midtrans",
      error: error.message,
    });
  }
};

// ======================================================
// 3. CHECK PAYMENT STATUS (Manual Polling)
// ======================================================
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const statusResponse = await coreApi.transaction.status(orderId);

    return res.status(200).json({
      success: true,
      order_id: orderId,
      transaction_status: statusResponse.transaction_status,
      payment_type: statusResponse.payment_type,
      gross_amount: statusResponse.gross_amount,
    });

  } catch (error) {
    console.error("CHECK PAYMENT STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mendapatkan status pembayaran",
    });
  }
};

// ======================================================
// NEW: START PRO TRIAL (7 Days Free Trial Activation)
// ======================================================
exports.startTrial = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "User tidak terautentikasi" });
    }

    // 1. Cek kuota pemakaian trial user
    const [users] = await db.query(
      `SELECT trial_used FROM tbr_users WHERE id = ?`,
      [req.user.id]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan" });
    }

    if (users[0].trial_used === 1 || users[0].trial_used === true) {
      return res.status(400).json({
        success: false,
        message: "Anda sudah pernah mengambil masa uji coba PRO Trial sebelumnya.",
      });
    }

    const now = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7); // Durasi 7 Hari

    const mysqlNowString = formatToMySQLDateTime(now);
    const mysqlEndString = formatToMySQLDateTime(trialEnd);

    // 2. Tandai status sub lama sebagai EXPIRED di tabel tbr_subscriptions jika ada
    try {
      await db.query(
        `UPDATE tbr_subscriptions SET status = 'EXPIRED' WHERE user_id = ?`,
        [req.user.id]
      );
    } catch (e) {
      console.warn("Tabel tbr_subscriptions dilewati atau belum diintegrasi:", e.message);
    }

    // 3. Catat transaksi log trial baru ke tbr_subscriptions
    try {
      await db.query(
        `
        INSERT INTO tbr_subscriptions
          (user_id, package_type, billing_cycle, start_date, end_date, status)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [req.user.id, "PRO", "TRIAL", mysqlNowString, mysqlEndString, "ACTIVE"]
      );
    } catch (subInsertErr) {
      console.warn("Skip log tbr_subscriptions insert:", subInsertErr.message);
    }

    // 4. UPDATE Data Utama User (Sinkronisasi dengan skema asli tbr_users Anda)
    await db.query(
      `
      UPDATE tbr_users
      SET 
        trial_used = 1,
        is_trial = 1,
        package_type = 'PRO',
        subscription_status = 'trialing',
        trial_start = ?,
        trial_end = ?,
        trial_ends_at = ?,
        subscription_ends_at = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [mysqlNowString, mysqlEndString, mysqlEndString, mysqlEndString, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: "Trial Paket PRO berhasil diaktifkan selama 7 hari!",
    });

  } catch (err) {
    console.error("START TRIAL ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Terjadi gangguan internal server sewaktu mengaktifkan trial.",
      error: err.message
    });
  }
};

// ======================================================
// 4. ACTIVATE PLAN (Subscription Activation Logic)
// ======================================================
exports.activatePlan = async (req, res) => {
  try {
    const { package_type, billing_cycle } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User tidak terautentikasi",
      });
    }

    if (!package_type || !billing_cycle) {
      return res.status(400).json({
        success: false,
        message: "package_type dan billing_cycle wajib diisi",
      });
    }

    try {
      await db.query(
        `UPDATE tbr_subscriptions SET status = 'EXPIRED' WHERE user_id = ?`,
        [req.user.id]
      );
    } catch (e) {}
    
    const startDate = new Date();
    const endDate = new Date();

    if (billing_cycle.toUpperCase() === "YEARLY") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const mysqlStart = formatToMySQLDateTime(startDate);
    const mysqlEnd = formatToMySQLDateTime(endDate);

    try {
      await db.query(
        `
        INSERT INTO tbr_subscriptions 
          (user_id, package_type, billing_cycle, start_date, end_date, status)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [req.user.id, package_type.toUpperCase(), billing_cycle.toUpperCase(), mysqlStart, mysqlEnd, "ACTIVE"]
      );
    } catch (e) {}

    // Pembelian Resmi (Paid Plan) mengubah status menjadi 'active' & mematikan is_trial
    await db.query(
      `
      UPDATE tbr_users
      SET
        package_type = ?,
        billing_cycle = ?,
        subscription_status = 'active',
        subscription_ends_at = ?,
        is_trial = 0,
        updated_at = NOW()
      WHERE id = ?
      `,
      [package_type.toUpperCase(), billing_cycle.toUpperCase(), mysqlEnd, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: "Paket berhasil diaktifkan",
    });

  } catch (err) {
    console.error("ACTIVATE PLAN ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error saat mengaktifkan paket",
    });
  }
};

// ======================================================
// 5. GET ALL PLANS (Mengambil daftar paket untuk Frontend)
// ======================================================
exports.getPlans = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM tbr_plans ORDER BY id ASC`);
    
    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error("GET PLANS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data paket dari database",
      error: error.message
    });
  }
};