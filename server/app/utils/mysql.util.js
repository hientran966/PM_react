const mysql = require('mysql2/promise');
const config = require('../config');

class MySQL {
    static async connect(config) {
        if (this.connection) return this.connection;
        this.connection = await mysql.createConnection(config);
        return this.connection;
    }

    static pool = mysql.createPool({
        host: config.db.host,
        port: config.db.port,
        user: config.db.username,
        password: config.db.password,
        database: config.db.database,
    });

    static async query(sql, params = []) {
        const [rows] = await this.pool.execute(sql, params);
        return rows;
    }

    static async transaction(callback) {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }
}

module.exports = MySQL;