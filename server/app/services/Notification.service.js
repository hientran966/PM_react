const { sendToUser } = require("../socket/index");

class NotificationService {
    constructor(mysql) {
        this.mysql = mysql;
    }

    async generateMessage(notification) {
        const { actor_id, type, reference_type, reference_id } = notification;

        const [actorRows] = await this.mysql.execute(
            "SELECT name FROM users WHERE id = ?",
            [actor_id]
        );
        const actorName = actorRows?.[0]?.name || "Người dùng";

        switch (type) {
            case "file_uploaded":
                switch (reference_type) {
                    case "task":
                        return `${actorName} đã thêm một file vào công việc.`;
                    case "project":
                        return `${actorName} đã thêm một file vào dự án.`;
                    default:
                        return `${actorName} đã tải lên một file mới.`;
            }

            case "file_approved":
                return `${actorName} đã phê duyệt file.`;

            case "comment_added":
                switch (reference_type) {
                    case "task":
                        return `${actorName} đã bình luận về công việc.`;
                    case "file":
                        return `${actorName} đã bình luận về file.`;
                    case "project":
                        return `${actorName} đã để lại bình luận trong dự án.`;
                    default:
                        return `${actorName} đã thêm một bình luận.`;
                }

            case "task_assigned":
                return `${actorName} đã giao cho bạn công việc.`;

            case "task_updated":
                return `${actorName} đã cập nhật công việc.`;

            case "project_invite":
                return `${actorName} đã mời bạn tham gia dự án.`;

            case "project_accepted":
                return `${actorName} đã chấp nhận lời mời tham gia dự án.`;

            case "project_declined":
                return `${actorName} đã từ chối lời mời tham gia dự án.`;

            case "project_status_changed":
                return `${actorName} đã thay đổi trạng thái của dự án.`;
            
            case "project_updated":
                return `${actorName} đã cập nhật thông tin của dự án.`;

            default:
                return `${actorName} đã thực hiện một hành động.`;
        }
    }

    async extractNotificationData(payload) {
        const notification = {
            recipient_id: payload.recipient_id ?? null,
            actor_id: payload.actor_id ?? null,
            type: payload.type ?? null,
            reference_type: payload.reference_type ?? null,
            reference_id: payload.reference_id ?? null,
            status: payload.status ?? "new"
        };

        notification.message =
            payload.message ?? (await this.generateMessage(notification));

        return notification;
    }

    async create(payload, connection = null) {
        const notification = await this.extractNotificationData(payload);
        const conn = connection || (await this.mysql.getConnection());
        let result;

        try {
            if (!connection) await conn.beginTransaction();

            [result] = await conn.execute(
                `
                INSERT INTO notifications 
                (recipient_id, actor_id, type, reference_type, reference_id, message, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    notification.recipient_id,
                    notification.actor_id,
                    notification.type,
                    notification.reference_type,
                    notification.reference_id,
                    notification.message,
                    notification.status
                ]
            );

            const newNotification = { id: result.insertId, ...notification };

            if (!connection) await conn.commit();
            if (newNotification.recipient_id) {
                sendToUser(newNotification.recipient_id, "notification", {
                    id: newNotification.id,
                    type: newNotification.type,
                    title: "Thông báo mới",
                    message: newNotification.message || "Bạn có thông báo mới",
                    reference_type: newNotification.reference_type,
                    reference_id: newNotification.reference_id,
                    created_at: new Date(),
                });
            }

            return newNotification;
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
                n.*, 
                u.name AS actor_name
            FROM notifications n
            LEFT JOIN users u ON u.id = n.actor_id
            WHERE n.deleted_at IS NULL
        `;
        const params = [];

        if (filter.recipient_id) {
            sql += " AND n.recipient_id = ?";
            params.push(filter.recipient_id);
        }
        if (filter.type) {
            sql += " AND n.type LIKE ?";
            params.push(`%${filter.type}%`);
        }
        if (filter.status !== undefined) {
            sql += " AND n.status = ?";
            params.push(filter.status);
        }

        sql += " ORDER BY n.created_at DESC";

        const [rows] = await this.mysql.execute(sql, params);
        return rows;
    }

    async findById(id) {
        const [rows] = await this.mysql.execute(
            `
            SELECT n.*, u.name AS actor_name 
            FROM notifications n
            LEFT JOIN users u ON u.id = n.actor_id
            WHERE n.id = ? AND n.deleted_at IS NULL
            `,
            [id]
        );
        return rows[0] || null;
    }

    async update(id, payload) {
        const allowedFields = ["type", "reference_type", "reference_id", "message", "status"];
        const fields = [];
        const params = [];

        for (const key of allowedFields) {
            if (Object.hasOwn(payload, key)) {
                fields.push(`${key} = ?`);
                params.push(payload[key]);
            }
        }

        if (!fields.length) return await this.findById(id);

        const sql = `UPDATE notifications SET ${fields.join(", ")} WHERE id = ?`;
        params.push(id);
        await this.mysql.execute(sql, params);
        return await this.findById(id);
    }

    async markAsRead(id) {
        await this.mysql.execute("UPDATE notifications SET status = 'read' WHERE id = ?", [id]);
        return await this.findById(id);
    }

    async markAllAsRead(recipient_id) {
        const [result] = await this.mysql.execute(
            "UPDATE notifications SET status = 'read' WHERE recipient_id = ? AND deleted_at IS NULL",
            [recipient_id]
        );
        return result.affectedRows;
    }

    async markAllAsUnread(recipient_id) {
        const [result] = await this.mysql.execute(
            "UPDATE notifications SET status = 'unread' WHERE recipient_id = ? AND status LIKE 'new' AND deleted_at IS NULL",
            [recipient_id]
        );
        return result.affectedRows;
    }

    async delete(id) {
        const noti = await this.findById(id);
        if (!noti) return null;

        const deletedAt = new Date();
        await this.mysql.execute("UPDATE notifications SET deleted_at = ? WHERE id = ?", [
            deletedAt,
            id
        ]);
        return { ...noti, deleted_at: deletedAt };
    }

    async restore(id) {
        const [result] = await this.mysql.execute(
            "UPDATE notifications SET deleted_at = NULL WHERE id = ?",
            [id]
        );
        return result.affectedRows > 0;
    }

    async deleteAll(recipient_id) {
        const deletedAt = new Date();
        await this.mysql.execute(
            "UPDATE notifications SET deleted_at = ? WHERE recipient_id = ?",
            [deletedAt, recipient_id]
        );
        return true;
    }

    async getNewCount(recipient_id) {
        const [rows] = await this.mysql.execute(
            "SELECT COUNT(*) AS count FROM notifications WHERE recipient_id = ? AND status = 'new' AND deleted_at IS NULL",
            [recipient_id]
        );
        return rows[0]?.count || 0;
    }
}

module.exports = NotificationService;