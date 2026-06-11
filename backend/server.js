require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const midtransClient = require('midtrans-client');

const app = express();

/* =========================================================
   MIDTRANS CONFIG
========================================================= */

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors());

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan('dev'));

/* =========================================================
   ROUTES IMPORT
========================================================= */

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes'); // 💡 Di dalam sini sudah mencakup fitur integrasi GitHub
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const billingRoutes = require('./routes/billingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');

// Import tambahan untuk keperluan bypass controller & middleware
const paymentController = require('./controllers/paymentController');
const { verifyToken } = require('./middleware/auth');

/* =========================================================
   API ROUTES
========================================================= */

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes); // 🛠️ Menangani core proyek, backlog, sprint, logs, & status GitHub
app.use('/api/dashboard', verifyToken, dashboardRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/subscription', subscriptionRoutes);

// 💡 BYPASS STRATEGY: Rute ini didaftarkan langsung ke core Express
// Ini memastikan rute Anda 100% TIDAK AKAN terkena 404 lagi akibat salah struktur file router
app.post('/api/payment/create-transaction', verifyToken, paymentController.createPayment);

// Sisa rute payment lainnya tetap dialirkan ke file router utama
app.use('/api/payment', paymentRoutes);

/* =========================================================
   TEST ROUTE
========================================================= */

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API ScrumApps berjalan 🚀',
    environment:
      process.env.MIDTRANS_IS_PRODUCTION === 'true'
        ? 'Production'
        : 'Sandbox',
    serverTime: new Date()
  });
});

/* =========================================================
   MIDTRANS TEST ROUTE
========================================================= */

app.get('/api/test-midtrans', async (req, res) => {
  try {
    const parameter = {
      transaction_details: {
        order_id: `ORDER-${Date.now()}`,
        gross_amount: 10000
      },
      credit_card: {
        secure: true
      },
      customer_details: {
        first_name: 'ScrumApps',
        email: 'test@scrumapps.com'
      }
    };

    const transaction = await snap.createTransaction(parameter);

    res.status(200).json({
      success: true,
      message: 'Midtrans connected successfully',
      token: transaction.token,
      redirect_url: transaction.redirect_url
    });
  } catch (error) {
    console.error('Midtrans Error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Failed connect to Midtrans',
      error: error.message
    });
  }
});

/* =========================================================
   404 HANDLER
========================================================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan'
  });
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: err.message
  });
});

/* =========================================================
   RUN SERVER
========================================================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
==================================================
🚀 ScrumApps Backend Running
==================================================
🌐 URL         : http://localhost:${PORT}
🛡️ Environment : ${
    process.env.MIDTRANS_IS_PRODUCTION === 'true'
      ? 'PRODUCTION'
      : 'SANDBOX'
  }
💳 Midtrans    : Connected
==================================================
`);
});