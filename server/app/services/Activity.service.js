const { sendToUser } = require("../socket/index");

class ActivityService {
    constructor(mysql) {
        this.mysql = mysql;
    }

    async extractActivityData(payload) {
        return {
            project_id: payload.project_id ?? null,
            task_id: payload.task_id ?? null,
            actor_id: payload.actor_id ?? null,
            detail: payload.detail ?? null,
            created_at: payload.created_at ?? new Date()
        };
    }

    async create(payload, connection = null) {
        const activity = await this.extractActivityData(payload);
        const conn = connection || (await this.mysql.getConnection());
        let result;

        try {
            if (!connection) await conn.beginTransaction();

            [result] = await conn.execute(
                `
                INSERT INTO activity_logs
                (task_id, actor_id, detail, created_at)
                VALUES (?, ?, ?, ?)
                `,
                [
                    activity.task_id,
                    activity.actor_id,
                    activity.detail,
                    activity.created_at
                ]
            );

            const newActivity = { id: result.insertId, ...activity };

            const [userRow] = await conn.execute(
                "SELECT user_id FROM project_members WHERE project_id = ?",
                [activity.project_id]
            );

            if (!connection) await conn.commit();

            for (const row of userRow) {
                sendToUser(row.user_id, "activity", {
                    id: newActivity.id,
                    user_id: newActivity.actor_id,
                    detail: newActivity.detail,
                    created_at: newActivity.created_at
                });
            }

            return newActivity;
        } catch (error) {
            if (!connection) await conn.rollback();
            throw error;
        } finally {
            if (!connection) conn.release();
        }
    }

    async find(filter = {}) {
        let sql = `
            SELECT 
                a.*, 
                JSON_OBJECT('id', u.id, 'name', u.name) AS user
            FROM activity_logs a
            LEFT JOIN users u ON u.id = a.actor_id
            WHERE a.deleted_at IS NULL
        `;
        const params = [];

        if (filter.task_id) {
            sql += " AND a.task_id = ?";
            params.push(filter.task_id);
        }
        if (filter.detail) {
            sql += " AND a.detail LIKE ?";
            params.push(`%${filter.detail}%`);
        }

        sql += " ORDER BY a.created_at DESC";

        const [rows] = await this.mysql.execute(sql, params);
        return rows;
    }

    async findById(id) {
        const [rows] = await this.mysql.execute(
            `
            SELECT a.*,
                JSON_OBJECT('id', u.id, 'name', u.name) AS user
            FROM activity_logs a
            LEFT JOIN users u ON u.id = a.actor_id
            WHERE a.id = ? AND a.deleted_at IS NULL
            `,
            [id]
        );
        return rows[0] || null;
    }

    async update(id, payload) {
        const allowedFields = ["detail", "created_at"];
        const fields = [];
        const params = [];

        for (const key of allowedFields) {
            if (Object.hasOwn(payload, key)) {
                fields.push(`${key} = ?`);
                params.push(payload[key]);
            }
        }

        if (!fields.length) return await this.findById(id);

        const sql = `UPDATE activity_logs SET ${fields.join(", ")} WHERE id = ?`;
        params.push(id);
        await this.mysql.execute(sql, params);
        return await this.findById(id);
    }

    async delete(id) {
        const act = await this.findById(id);
        if (!act) return null;

        const deletedAt = new Date();
        await this.mysql.execute("UPDATE activity_logs SET deleted_at = ? WHERE id = ?", [
            deletedAt,
            id
        ]);
        return { ...act, deleted_at: deletedAt };
    }

    async restore(id) {
        const [result] = await this.mysql.execute(
            "UPDATE activity_logs SET deleted_at = NULL WHERE id = ?",
            [id]
        );
        return result.affectedRows > 0;
    }

    async deleteAll(task_id) {
        const deletedAt = new Date();
        await this.mysql.execute(
            "UPDATE activity_logs SET deleted_at = ? WHERE task_id = ?",
            [deletedAt, task_id]
        );
        return true;
    }

}

module.exports = ActivityService;