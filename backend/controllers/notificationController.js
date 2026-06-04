const db = require('../models');

exports.handleNotification = async (req, res) => {
    try {
        const statusResponse = req.body;
        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        const order = await db.Order.findOne({ where: { order_id: orderId } });
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (transactionStatus === 'settlement') {
            // 1. Update status order
            await order.update({ status: 'success' });

            // 2. Update Tier User & Masa Aktif
            const user = await db.User.findByPk(order.user_id);
            const durationDays = order.plan === 'PRO_MONTHLY' ? 30 : 365;
            
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + durationDays);

            await user.update({
                subscription_tier: 'PRO',
                subscription_expiry: expiryDate
            });
        } 
        // Logika untuk 'expire' atau 'cancel' bisa ditambahkan di sini

        res.status(200).send('OK');
    } catch (error) {
        res.status(500).send(error.message);
    }
};