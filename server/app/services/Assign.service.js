const NotificationService = require("./Notification.service");
const { sendToProject } = require("../socket/index");

class AssignmentService {
    constructor(mysql) {
        this.mysql = mysql;
    }

    async extractAssignmentData(payload) {
        return {
            task_id: payload.task_id ?? null,
            user_id: payload.user_id ?? null,
        };
    }

    async create(payload, connection = null) {
        const assignment = await this.extractAssignmentData(payload);
        const shouldRelease = !connection;
        const conn = connection || (await this.mysql.getConnection());
        const notificationService = new NotificationService(this.mysql);

        try {
            if (!connection) await conn.beginTransaction();

            const [existing] = await conn.execute(
                `SELECT id FROM task_assignees 
                 WHERE task_id = ? AND user_id = ? AND deleted_at IS NULL`,
                [assignment.task_id, assignment.user_id]
            );

            if (existing.length > 0) {
                if (!connection) await conn.commit();
                return { id: existing[0].id, ...assignment, skipped: true };
            }

            const [result] = await conn.execute(
                `INSERT INTO task_assignees (task_id, user_id)
                 VALUES (?, ?)`,
                [assignment.task_id, assignment.user_id]
            );

            const newAssignment = { id: result.insertId, ...assignment };

            if (payload.actor_id !== assignment.user_id) {
                await notificationService.create(
                    {
                        actor_id: payload.actor_id,
                        recipient_id: assignment.user_id,
                        type: "task_assigned",
                        reference_type: "task",
                        reference_id: assignment.task_id,
                        project_id: payload.project_id,
                    },
                    conn
                );
            }

            if (payload.project_id) {
                sendToProject(payload.project_id, "task_updated", {
                    project_id: payload.project_id,
                    task_id: assignment.task_id,
                });
            }

            if (!connection) await conn.commit();
            return newAssignment;
        } catch (error) {
            if (!connection) await conn.rollback();
            throw error;
        } finally {
            if (shouldRelease) conn.release();
        }
    }

    async find(filter = {}) {
        let sql = "SELECT * FROM task_assignees WHERE deleted_at IS NULL";
        const params = [];

        if (filter.user_id) {
            sql += " AND user_id = ?";
            params.push(filter.user_id);
        }
        if (filter.task_id) {
            sql += " AND task_id = ?";
            params.push(filter.task_id);
        }

        const [rows] = await this.mysql.execute(sql, params);
        return rows;
    }

    async findById(id) {
        const [rows] = await this.mysql.execute(
            "SELECT * FROM task_assignees WHERE id = ? AND deleted_at IS NULL",
            [id]
        );
        return rows[0] || null;
    }

    async update(id, payload) {
        const assignment = await this.extractAssignmentData(payload);
        const fields = [];
        const params = [];

        for (const key in assignment) {
            if (key === "id") continue;
            fields.push(`${key} = ?`);
            params.push(assignment[key]);
        }

        if (fields.length === 0) return await this.findById(id);

        const sql = `UPDATE task_assignees SET ${fields.join(", ")} WHERE id = ?`;
        params.push(id);

        await this.mysql.execute(sql, params);
        return { ...assignment, id };
    }

    async delete(id) {
        const assignment = await this.findById(id);
        if (!assignment) return null;

        const deletedAt = new Date();
        await this.mysql.execute(
            "UPDATE task_assignees SET deleted_at = ? WHERE id = ?",
            [deletedAt, id]
        );

        return { ...assignment, deleted_at: deletedAt, id };
    }

    async restore(id) {
        const [result] = await this.mysql.execute(
            "UPDATE task_assignees SET deleted_at = NULL WHERE id = ?",
            [id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = AssignmentService;