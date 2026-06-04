// controllers/subscriptionController.js
const midtransClient = require('midtrans-client');
const db = require('../config/db'); 

// Midtrans Sandbox Config
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

/**
 * =========================================================================
 * INTERNAL HELPER: AUDIT LOGS SUBSCRIPTION
 * =========================================================================
 */
const createSystemLog = async (userId, activityDescription) => {
    try {
        // Karena subscription bersifat global/akun, project_id diisi NULL
        const sql = `
            INSERT INTO tbr_activity_logs (user_id, project_id, activity, created_at) 
            VALUES (?, NULL, ?, NOW())
        `;
        await db.query(sql, [userId, activityDescription]);
        console.log(`[SUBSCRIPTION LOG SUCCESS]: ${activityDescription}`);
    } catch (err) {
        console.error("[SUBSCRIPTION LOG ERROR]: Gagal mencatat log paket:", err.message);
    }
};

/**
 * ==========================================
 * 1. CREATE CHECKOUT (SNAP TOKEN GENERATOR)
 * ==========================================
 */
exports.createCheckout = async (req, res) => {
    try {
        const { plan, amount, isAnnual = false } = req.body;

        console.log('🧾 Checkout Request:', { 
            userId: req.user.id, 
            plan, 
            amount, 
            isAnnual 
        });

        // Validasi Plan & Nominal Resmi
        const planPrices = {
            'PRO': 150000,
            'ENTERPRISE': 5000000
        };

        if (!planPrices[plan]) {
            return res.status(400).json({ 
                success: false, 
                message: `Plan ${plan} tidak valid. Pilih PRO atau ENTERPRISE` 
            });
        }

        const finalAmount = parseInt(amount) || planPrices[plan];

        // Midtrans Parameter Structure
        const parameter = {
            transaction_details: {
                order_id: `SCRUM-${Date.now()}-${req.user.id}-${Math.random().toString(36).substr(2, 5)}`,
                gross_amount: finalAmount
            },
            customer_details: {
                first_name: req.user.name?.split(' ')[0] || "User",
                last_name: req.user.name?.split(' ').slice(1).join(' ') || "",
                email: req.user.email,
                phone: req.user.phone_number || "081234567890"
            },
            item_details: [{
                id: plan,
                price: finalAmount,
                quantity: 1,
                name: `${plan} Package ${isAnnual ? 'Tahunan (20% OFF)' : 'Bulanan'}`,
                brand: "ScrumApps",
                category: "SaaS Subscription"
            }],
            expiry: {
                start_time: new Date(Date.now() + (15 * 60 * 1000)).toISOString(), // Aktif 15 Menit
                duration: 15,
                unit: "minutes"
            }
        };

        // Buat transaksi Midtrans SNAP
        const transaction = await snap.createTransaction(parameter);
        
        // Simpan log invoice dengan status awal 'pending'
        await db.query(
            `INSERT INTO transactions (
                user_id, order_id, snap_token, amount, plan, is_annual, status
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [
                req.user.id, 
                parameter.transaction_details.order_id, 
                transaction.token, 
                finalAmount, 
                plan, 
                isAnnual
            ]
        );

        console.log('✅ Snap Token Created:', parameter.transaction_details.order_id);

        res.json({ 
            success: true, 
            token: transaction.token,
            order_id: parameter.transaction_details.order_id,
            amount: finalAmount,
            redirect_url: transaction.redirect_url
        });

    } catch (error) {
        console.error('❌ Midtrans Error:', error);
        res.status(500).json({ 
            success: false, 
            message: `Gagal membuat checkout: ${error.message}` 
        });
    }
};

/**
 * ==========================================
 * 2. MIDTRANS WEBHOOK / NOTIFICATION HANDLER
 * ==========================================
 */
exports.handleMidtransWebhook = async (req, res) => {
    try {
        console.log('📨 Midtrans Webhook Raw Body:', req.body);

        // 🔥 TINGKAT KEAMANAN: Validasi payload webhook asli langsung melalui engine SDK Midtrans
        let statusResponse;
        try {
            statusResponse = await snap.transaction.notification(req.body);
        } catch (verifErr) {
            console.error('⚠️ Webhook Verification Failed. Request dibatalkan.', verifErr.message);
            return res.status(401).json({ message: "Invalid Signature Key" });
        }

        const { 
            order_id, 
            transaction_status, 
            payment_type, 
            gross_amount,
            fraud_status 
        } = statusResponse;

        if (!order_id) {
            console.log('⚠️ Missing order_id');
            return res.status(400).send("OK");
        }

        // Cari record transaksi di local DB
        const [transactions] = await db.query(
            'SELECT * FROM transactions WHERE order_id = ?',
            [order_id]
        );

        if (transactions.length === 0) {
            console.log('⚠️ Transaction record not found di DB:', order_id);
            return res.status(404).send("OK");
        }

        const transaction = transactions[0];

        // Update status transaksi utama
        await db.query(
            `UPDATE transactions SET 
                status = ?, 
                payment_type = ?, 
                gross_amount = ?, 
                fraud_status = ?
             WHERE order_id = ?`,
            [transaction_status, payment_type, gross_amount, fraud_status, order_id]
        );

        // Validasi Kondisi Keberhasilan Pembayaran
        const isPaymentSuccess = 
            transaction_status === 'settlement' || 
            (transaction_status === 'capture' && fraud_status === 'accept');

        // 🔥 PROSES AKTIVASI PAKET & SINKRONISASI KE TABEL tbr_users
        if (isPaymentSuccess) {
            const days = transaction.is_annual ? 365 : 30;
            const planDurationText = transaction.is_annual ? 'Tahunan' : 'Bulanan';
            
            // Update package_type di tbr_users agar sinkron dengan limitasi projectController
            await db.query(
                `UPDATE tbr_users SET 
                    package_type = ?, 
                    subscription_status = 'active',
                    subscription_ends_at = DATE_ADD(NOW(), INTERVAL ? DAY)
                 WHERE id = ?`,
                [transaction.plan, days, transaction.user_id]
            );

            // Cetak rekaman audit log sistem ke database
            await createSystemLog(
                transaction.user_id, 
                `Berhasil melakukan upgrade akun ke paket premium [${transaction.plan}] skema ${planDurationText} via ${payment_type.toUpperCase()}`
            );

            console.log('🎉 Subscription SUCCESSFULLY ACTIVATED:', {
                user_id: transaction.user_id,
                plan: transaction.plan,
                order_id: order_id
            });
        } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
            // Skenario Opsional: Catat jika transaksi kedaluwarsa atau ditolak bank
            console.log(`❌ Transaction state updated to: ${transaction_status.toUpperCase()} for order: ${order_id}`);
        }

        res.status(200).send("OK");

    } catch (error) {
        console.error('❌ Webhook Processing Error:', error);
        res.status(500).send("ERROR");
    }
};