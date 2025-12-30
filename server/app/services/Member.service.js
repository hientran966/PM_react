const NotificationService = require("./Notification.service");
const { sendToProject } = require("../socket/index");

class MemberService {
    constructor(mysql) {
        this.mysql = mysql;
    }

    async extractMemberData(payload) {
        return {
            project_id: payload.project_id ?? null,
            user_id: payload.user_id ?? null,
            role: payload.role ?? "member",
            invited_by: payload.invited_by ?? null,
            status: payload.status ?? "invited",
        };
    }

    async create(payload, externalConnection = null) {
        const member = await this.extractMemberData(payload);
        const connection = externalConnection || (await this.mysql.getConnection());
        const notificationService = new NotificationService(this.mysql);
        let ownTransaction = false;

        try {
        if (!externalConnection) {
            await connection.beginTransaction();
            ownTransaction = true;
        }

        const [existing] = await connection.execute(
            `SELECT id, status FROM project_members 
                WHERE project_id = ? AND user_id = ? AND status != 'declined' AND deleted_at IS NULL`,
            [member.project_id, member.user_id]
        );

        if (existing.length > 0) {
            if (ownTransaction) await connection.rollback();
            return {
            id: existing[0].id,
            ...member,
            skipped: true,
            status: existing[0].status,
            };
        }

        const [result] = await connection.execute(
            `INSERT INTO project_members 
                (project_id, user_id, role, status, invited_by)
                VALUES (?, ?, ?, ?, ?)`,
            [
            member.project_id,
            member.user_id,
            member.role,
            member.status,
            member.invited_by,
            ]
        );

        const newMember = { id: result.insertId, ...member };

        if (member.invited_by && member.status === "invited") {
            await notificationService.create(
            {
                actor_id: member.invited_by,
                recipient_id: member.user_id,
                type: "project_invite",
                reference_type: "project",
                reference_id: member.project_id,
            },
            connection
            );
        }

        if (ownTransaction) await connection.commit();
            return newMember;
        } catch (error) {
            if (ownTransaction) await connection.rollback();
        throw error;
        } finally {
            if (!externalConnection) connection.release();
        }
    }

    async findById(id, connection = this.mysql) {
        const [rows] = await connection.execute(
        "SELECT * FROM project_members WHERE id = ? AND status != 'declined' AND deleted_at IS NULL",
        [id]
        );
        return rows[0] || null;
    }

    async update(id, payload, connection = this.mysql) {
        const fields = [];
        const params = [];

        for (const key in payload) {
            if (key === "id") continue;
            fields.push(`${key} = ?`);
            params.push(payload[key]);
        }

        if (fields.length === 0) {
            throw new Error("Không có trường nào để cập nhật.");
        }

        const sql = `UPDATE project_members SET ${fields.join(", ")} WHERE id = ?`;
        params.push(id);

        await connection.execute(sql, params);
        return this.findById(id, connection);
    }

    async delete(id) {
        const connection = await this.mysql.getConnection();

        try {
            await connection.beginTransaction();

            // Lấy member để biết project_id & user_id
            const member = await this.findById(id, connection);
            if (!member) {
                await connection.rollback();
                return null;
            }

            const { project_id, user_id } = member;

            // 1. Soft delete project_members
            await connection.execute(
                `UPDATE project_members 
                SET deleted_at = NOW() 
                WHERE id = ?`,
                [id]
            );

            // 2. Xóa phân công task (task_assignees) trong project
            await connection.execute(
                `
                UPDATE task_assignees ta
                JOIN tasks t ON ta.task_id = t.id
                SET ta.deleted_at = NOW()
                WHERE 
                    t.project_id = ?
                    AND ta.user_id = ?
                    AND ta.deleted_at IS NULL
                `,
                [project_id, user_id]
            );

            // 3. Xóa member khỏi các chat channel của project
            await connection.execute(
                `
                UPDATE chat_channel_members ccm
                JOIN chat_channels cc ON ccm.channel_id = cc.id
                SET ccm.deleted_at = NOW()
                WHERE 
                    cc.project_id = ?
                    AND ccm.user_id = ?
                    AND ccm.deleted_at IS NULL
                `,
                [project_id, user_id]
            );

            if (project_id) {
                sendToProject(project_id, "task_updated", {
                    project_id: project_id,
                });
            }

            await connection.commit();
            return id;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async getByProjectId(id) {
        const sql = `SELECT DISTINCT pm.*, u.name, u.id AS user_id 
            FROM users u 
            LEFT JOIN project_members pm ON u.id = pm.user_id 
            WHERE project_id = ? 
            AND pm.status = 'accepted' 
            AND pm.deleted_at IS NULL
            AND u.deleted_at IS NULL`;
        const [rows] = await this.mysql.execute(sql, [id]);
        return rows;
    }

    async getInviteList(userId) {
        const sql = `
            SELECT pm.*, u.name AS invited_by_name, p.name AS project_name
            FROM project_members pm
            JOIN users u ON pm.invited_by = u.id
            JOIN projects p ON pm.project_id = p.id
            WHERE 
                pm.user_id = ?
                AND pm.status = 'invited'
                AND pm.deleted_at IS NULL
        `;
        const [rows] = await this.mysql.execute(sql, [userId]);
        return rows;
    }

    async checkIfMemberExists(projectId, userId) {
        const sql = `
            SELECT COUNT(*) AS count
            FROM project_members
            WHERE 
                project_id = ?
                AND user_id = ?
                AND status != 'declined'
                AND deleted_at IS NULL
        `;
        const [rows] = await this.mysql.execute(sql, [projectId, userId]);
        return rows[0].count > 0;
    }

    async acceptInvite(id, userId) {
        const connection = await this.mysql.getConnection();
        const notificationService = new NotificationService(this.mysql);

        try {
            await connection.beginTransaction();

            const member = await this.findById(id, connection);
            if (!member || member.user_id !== userId || member.status !== "invited") {
                await connection.rollback();
                return null;
            }

            const updated = await this.update(id, { status: "accepted" }, connection);

            if (member.invited_by && member.invited_by !== userId) {
                await notificationService.create(
                    {
                        actor_id: userId,
                        recipient_id: member.invited_by,
                        type: "project_accepted",
                        reference_type: "project",
                        reference_id: member.project_id,
                    },
                    connection
                );
            }

            if (member.project_id) {
                sendToProject(member.project_id, "task_updated", {
                    project_id: member.project_id,
                });
            }

            await connection.commit();
            return updated;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async declineInvite(id, userId) {
        const connection = await this.mysql.getConnection();
        const notificationService = new NotificationService(this.mysql);

        try {
            await connection.beginTransaction();

            const member = await this.findById(id, connection);
            if (!member || member.user_id !== userId || member.status !== "invited") {
                await connection.rollback();
                return null;
            }

            const updated = await this.update(id, { status: "declined" }, connection);

            if (member.invited_by && member.invited_by !== userId) {
                await notificationService.create(
                    {
                        actor_id: userId,
                        recipient_id: member.invited_by,
                        type: "project_declined",
                        reference_type: "project",
                        reference_id: member.project_id,
                    },
                    connection
                );
            }

            await connection.commit();
            return updated;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = MemberService;