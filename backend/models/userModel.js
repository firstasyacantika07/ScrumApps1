const db = require('../config/db');

class UserModel {
    static async getAll() {
        const [rows] = await db.query('SELECT id, name, email, role, package_type, subscription_status, trial_ends_at, subscription_ends_at, created_at FROM tbr_users');
        return rows;
    }

    static async findByEmail(email) {
        const [rows] = await db.query('SELECT * FROM tbr_users WHERE email = ?', [email]);
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await db.query('SELECT * FROM tbr_users WHERE id = ?', [id]);
        return rows[0];
    }

    static async create(data) {
        const { name, email, password, role, package_type, subscription_status, trial_ends_at } = data;
        const [result] = await db.query(
            'INSERT INTO tbr_users (name, email, password, role, package_type, subscription_status, trial_ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, email, password, role || 'User', package_type || 'FREE', subscription_status || 'active', trial_ends_at || null]
        );
        return result.insertId;
    }

    static async updateSubscription(id, data) {
        const { package_type, subscription_status, subscription_ends_at, trial_ends_at } = data;
        await db.query(
            'UPDATE tbr_users SET package_type = ?, subscription_status = ?, subscription_ends_at = ?, trial_ends_at = ? WHERE id = ?',
            [package_type, subscription_status, subscription_ends_at, trial_ends_at, id]
        );
    }

    static async delete(id) {
        await db.query('DELETE FROM tbr_users WHERE id = ?', [id]);
    }
}

module.exports = UserModel;