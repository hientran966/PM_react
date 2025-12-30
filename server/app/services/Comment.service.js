const { sendToProject } = require("../socket/index");
const NotificationService = require("./Notification.service");
const ActivityService = require("./Activity.service");

class CommentService {
  constructor(mysql) {
    this.mysql = mysql;
    this.notificationService = new NotificationService(mysql);
    this.activityService = new ActivityService(mysql);
  }

  async extractCommentData(payload) {
    return {
      user_id: payload.user_id ?? null,
      task_id: payload.task_id ?? null,
      file_id: payload.file_id ?? null,
      file_version_id: payload.file_version_id ?? null,
      content: payload.content ?? null,
    };
  }

  async create(payload) {
    const comment = await this.extractCommentData(payload);
    const connection = await this.mysql.getConnection();

    try {
      await connection.beginTransaction();

      const [commentRes] = await connection.execute(
        `INSERT INTO comments (user_id, task_id, file_version_id, content)
         VALUES (?, ?, ?, ?)`,
        [
          comment.user_id,
          comment.task_id,
          comment.file_version_id,
          comment.content,
        ]
      );
      const commentId = commentRes.insertId;

      if (payload.visual) {
        const visual = payload.visual;
        await connection.execute(
          `INSERT INTO visual_annotations 
            (comment_id, file_version_id, coordinates, color, opacity)
           VALUES (?, ?, ?, ?, ?)`,
          [
            commentId,
            comment.file_version_id,
            JSON.stringify(visual.coordinates ?? {}),
            visual.color ?? "#FF0000",
            visual.opacity ?? 0.5,
          ]
        );
      }

      if (payload.owner_id && payload.owner_id !== comment.user_id) {
        await this.notificationService.create({
          recipient_id: payload.owner_id,
          actor_id: comment.user_id,
          type: "comment_added",
          reference_type: comment.task_id ? "task" : (comment.file_id ? "file" : "project"),
          reference_id: comment.task_id || comment.file_id || null,
        },
        connection
        );
      }

      if (comment.task_id){
        await this.activityService.create(
          {
            task_id: comment.task_id,
            actor_id: comment.user_id,
            detail: `Bình luận mới`,
          },
          connection
        );
      }

      await connection.commit();
      const fullComment = await this.findById(commentId);

      if (payload.project_id) {
        sendToProject(payload.project_id, "comment", {
          action: "create",
          data: fullComment,
        });
      }

      return fullComment;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async find(filter = {}) {
    const conditions = ["c.deleted_at IS NULL"];
    const params = [];

    if (filter.user_id) {
      conditions.push("c.user_id = ?");
      params.push(filter.user_id);
    }
    if (filter.task_id) {
      conditions.push("c.task_id = ?");
      params.push(filter.task_id);
    }
    if (filter.file_version_id) {
      conditions.push("c.file_version_id = ?");
      params.push(filter.file_version_id);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT 
        c.*,
        JSON_OBJECT('id', u.id, 'name', u.name) AS user,
        JSON_OBJECT(
          'id', va.id,
          'coordinates', va.coordinates,
          'color', va.color,
          'opacity', va.opacity
        ) AS visual
      FROM comments c
      JOIN users u ON u.id = c.user_id
      LEFT JOIN visual_annotations va ON va.comment_id = c.id
      ${whereClause}
      ORDER BY c.created_at DESC;
    `;

    const [rows] = await this.mysql.execute(sql, params);
    return rows;
  }

  async findById(id) {
    const sql = `
      SELECT 
        c.*,
        JSON_OBJECT('id', u.id, 'name', u.name) AS user,
        JSON_OBJECT(
          'id', va.id,
          'coordinates', va.coordinates,
          'color', va.color,
          'opacity', va.opacity
        ) AS visual
      FROM comments c
      JOIN users u ON u.id = c.user_id
      LEFT JOIN visual_annotations va ON va.comment_id = c.id
      WHERE c.id = ? AND c.deleted_at IS NULL
    `;
    const [rows] = await this.mysql.execute(sql, [id]);
    return rows[0] || null;
  }

  async update(id, payload) {
    const allowedFields = ["content"];
    const fields = [];
    const params = [];

    for (const key of allowedFields) {
      if (key in payload) {
        fields.push(`${key} = ?`);
        params.push(payload[key]);
      }
    }

    if (fields.length === 0 && !payload.visual) {
      return await this.findById(id);
    }

    const connection = await this.mysql.getConnection();
    try {
      await connection.beginTransaction();

      if (fields.length > 0) {
        const sql = `UPDATE comments SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        params.push(id);
        await connection.execute(sql, params);
      }

      if (payload.visual) {
        const v = payload.visual;
        const [exists] = await connection.execute(
          "SELECT id FROM visual_annotations WHERE comment_id = ?",
          [id]
        );

        if (exists.length > 0) {
          await connection.execute(
            `UPDATE visual_annotations 
             SET coordinates=?, color=?, opacity=? 
             WHERE comment_id=?`,
            [
              JSON.stringify(v.coordinates ?? {}),
              v.color ?? "#FF0000",
              v.opacity ?? 0.5,
              id,
            ]
          );
        } else {
          await connection.execute(
            `INSERT INTO visual_annotations (comment_id, file_version_id, coordinates, color, opacity)
             VALUES (?, ?, ?, ?, ?)`,
            [
              id,
              payload.file_version_id ?? null,
              JSON.stringify(v.coordinates ?? {}),
              v.color ?? "#FF0000",
              v.opacity ?? 0.5,
            ]
          );
        }
      }

      await connection.commit();
      return await this.findById(id);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async delete(id) {
    const comment = await this.findById(id);
    if (!comment) return null;

    const deletedAt = new Date();
    await this.mysql.execute(
      "UPDATE comments SET deleted_at = ? WHERE id = ?",
      [deletedAt, id]
    );
    return { ...comment, deleted_at: deletedAt };
  }

  async restore(id) {
    const [result] = await this.mysql.execute(
      "UPDATE comments SET deleted_at = NULL WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = CommentService;
