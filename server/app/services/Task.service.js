const AssignmentService = require("./Assign.service");
const MemberService = require("./Member.service");
const ActivityService = require("./Activity.service");
const { sendToUser, sendToProject } = require("../socket/index");

class TaskService {
  constructor(mysql) {
    this.mysql = mysql;
    this.assignmentService = new AssignmentService(mysql);
    this.memberService = new MemberService(mysql);
    this.activityService = new ActivityService(mysql);
  }

  async extractTaskData(payload) {
    return {
      project_id: payload.project_id,
      title: payload.title,
      description: payload.description ?? null,
      status: payload.status ?? "todo",
      priority: payload.priority ?? "medium",
      start_date: payload.start_date ?? null,
      due_date: payload.due_date ?? null,
      created_by: payload.created_by ?? null,
    };
  }

  formatField(keys) {
    const FIELD_LABELS = {
      title: "tiêu đề",
      description: "mô tả",
      status: "trạng thái",
      priority: "ưu tiên",
      start_date: "ngày bắt đầu",
      due_date: "hạn chót",
    };

    if (Array.isArray(keys)) {
      return keys.map((k) => FIELD_LABELS[k] || k).join(", ");
    }

    return FIELD_LABELS[keys] || keys;
  }

  /** ===================== CREATE TASK ===================== **/
  async create(payload) {
    const task = await this.extractTaskData(payload);
    const connection = await this.mysql.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `INSERT INTO tasks (title, description, start_date, due_date, created_by, project_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          task.title,
          task.description,
          task.start_date,
          task.due_date,
          task.created_by,
          task.project_id,
          payload.status ?? "todo",
        ]
      );

      const taskId = result.insertId;
      const newTask = { id: taskId, ...task };

      // Gán người thực hiện
      if (Array.isArray(payload.members) && payload.members.length > 0) {
        for (const userId of payload.members) {
          await this.assignmentService.create(
            { task_id: taskId, user_id: userId, actor_id: payload.created_by },
            connection
          );
        }
      }

      await connection.commit();

      // Gửi socket
      const members = await this.memberService.getByProjectId(task.project_id);
      if (members?.length > 0) {
        for (const member of members) {
          sendToUser(member.user_id, "task_updated", {
            task: newTask,
            message: `Task "${newTask.title}" vừa được tạo trong dự án ${newTask.project_id}`,
          });
        }
      }

      return newTask;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /** ===================== FIND TASKS ===================== **/
  async find(filter = {}) {
    let sql = `
      SELECT 
        t.*, 
        COALESCE((
          SELECT pl.progress
          FROM progress_logs pl
          WHERE pl.task_id = t.id
          ORDER BY pl.created_at DESC
          LIMIT 1
        ), 0) AS latest_progress,
        (
          SELECT JSON_ARRAYAGG(ta.user_id)
          FROM task_assignees ta
          WHERE ta.task_id = t.id AND ta.deleted_at IS NULL
        ) AS assignees,
        (
        SELECT JSON_OBJECT(
          'id', al.id,
          'actor_id', al.actor_id,
          'detail', al.detail,
          'created_at', al.created_at
        ) AS latest_activity
        FROM activity_logs al
        WHERE al.task_id = t.id AND al.deleted_at IS NULL
        ORDER BY al.created_at DESC
        LIMIT 1
      ) AS latest_activity

    FROM tasks t
    WHERE t.deleted_at IS NULL
    `;

    const params = [];
    if (filter.project_id) {
      sql += " AND t.project_id = ?";
      params.push(filter.project_id);
    }
    if (filter.status) {
      sql += " AND t.status = ?";
      params.push(filter.status);
    }
    if (filter.title) {
      sql += " AND t.title LIKE ?";
      params.push(`%${filter.title}%`);
    }

    sql += " ORDER BY t.created_at DESC";

    const [rows] = await this.mysql.execute(sql, params);

    for (const row of rows) {
      if (typeof row.latest_activity === "string") {
        try {
          row.latest_activity = JSON.parse(row.latest_activity);
        } catch {
          row.latest_activity = null;
        }
      }
    }

    return rows;
  }

  /** ===================== FIND BY ID ===================== **/
  async findById(id) {
    const [rows] = await this.mysql.execute(
      `SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    const task = rows[0];
    if (!task) return null;
    const [logRows] = await this.mysql.execute(
      `SELECT progress FROM progress_logs WHERE task_id = ? ORDER BY created_at DESC LIMIT 1`,
      [id]
    );
    task.latest_progress = logRows[0]?.progress ?? 0;

    return task;
  }

  /** ===================== UPDATE TASK ===================== **/
  async update(id, data) {
    const conn = await this.mysql.getConnection();
    try {
      await conn.beginTransaction();

      const [oldRows] = await conn.execute(
        `SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL`,
        [id]
      );
      const oldTask = oldRows[0];
      if (!oldTask) throw new Error("Task not found");

      const safeData = { ...data };
      delete safeData.id;
      delete safeData.updated_by;
      delete safeData.changedField;

      const fields = [];
      const params = [];
      for (const key in safeData) {
        fields.push(`${key} = ?`);
        params.push(safeData[key]);
      }
      params.push(id);

      if (fields.length)
        await conn.execute(
          `UPDATE tasks SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`,
          params
        );

      await this.activityService.create(
        {
          task_id: id,
          actor_id: data.updated_by ?? null,
          detail: `Đã cập nhật ${this.formatField(data.changedField)}`,
        },
        conn
      );

      if (oldTask.project_id) {
        sendToProject(oldTask.project_id, "task_updated", {
            project_id: oldTask.project_id,
            task_id: oldTask.id,
        });
      }

      await conn.commit();
      return { success: true };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /** ===================== DELETE ===================== **/
  async delete(id, actorId) {
    const connection = await this.mysql.getConnection();
    try {
      await connection.beginTransaction();

      const [rows] = await connection.execute(
        `SELECT id, title, project_id FROM tasks WHERE id = ? AND deleted_at IS NULL`,
        [id]
      );
      const task = rows[0];
      if (!task) throw new Error("Task not found");

      const deletedAt = new Date();
      await connection.execute(`UPDATE tasks SET deleted_at = ? WHERE id = ?`, [
        deletedAt,
        id,
      ]);

      await connection.commit();

      const members = await this.memberService.getByProjectId(task.project_id);
      if (members?.length > 0) {
        for (const member of members) {
          sendToUser(member.user_id, "task_updated", {
            task: task,
            message: `Task "${task.title}" đã được xóa`,
          });
        }
      }

      return { ...task, deleted_at: deletedAt };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async restore(id) {
    const [result] = await this.mysql.execute(
      "UPDATE tasks SET deleted_at = NULL WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  }

  /** ===================== FIND BY USER ===================== **/
  async findByAccountId(userId) {
    const sql = `
      SELECT DISTINCT t.* 
      FROM tasks t
      INNER JOIN task_assignees ta ON t.id = ta.task_id
      WHERE ta.user_id = ? AND t.deleted_at IS NULL
    `;
    const [rows] = await this.mysql.execute(sql, [userId]);
    return rows;
  }

  /** ===================== LOG PROGRESS ===================== **/
  async logProgress(taskId, progressData, loggedBy, comment = null) {
    const connection = await this.mysql.getConnection();
    try {
      await connection.beginTransaction();

      const [rows] = await connection.execute(
        `SELECT id, title, project_id
         FROM tasks WHERE id = ? AND deleted_at IS NULL`,
        [taskId]
      );
      const task = rows[0];
      if (!task) throw new Error("Task not found");

      let progressPercent = 0;
      const value = Number(progressData?.progress_value ?? 0);
      progressPercent = Math.max(0, Math.min(100, value));
      await connection.execute(
        `INSERT INTO progress_logs (task_id, progress, updated_by)
          VALUES (?, ?, ?)`,
        [taskId, progressPercent, loggedBy]
      );

      await this.activityService.create(
        {
          task_id: taskId,
          actor_id: loggedBy,
          detail: `Cập nhật tiến độ: ${progressPercent.toFixed(1)}%`,
        },
        connection
      );

      await connection.commit();

      const members = await this.memberService.getByProjectId(task.project_id);
      for (const member of members) {
        sendToUser(member.user_id, "task_updated", {
          task_id: task.id,
          project_id: task.project_id,
          progress_value: progressPercent,
          message: `Tiến độ của task "${task.title}" vừa được cập nhật: ${progressPercent.toFixed(
            1
          )}%`,
        });
      }

      return {
        task_id: taskId,
        progress_value: progressPercent,
        logged_by: loggedBy,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /** ===================== DELETE ASSIGN ===================== **/
  async deleteAssign(taskId, actorId) {
    const [result] = await this.mysql.execute(
      `DELETE FROM task_assignees WHERE task_id = ?`,
      [taskId]
    );
    await this.activityService.create({
      task_id: taskId,
      actor_id: actorId,
      detail: `Đã cập nhật người thực hiện`,
    });
    return { affectedRows: result.affectedRows };
  }

  /** ===================== GET ROLE ===================== **/
  async getRole(taskId, userId) {
    const sql = `
      SELECT
        CASE WHEN t.created_by = ? THEN TRUE ELSE FALSE END AS isCreator,
        CASE WHEN ta.id IS NOT NULL THEN TRUE ELSE FALSE END AS isAssigned
      FROM tasks t
      LEFT JOIN task_assignees ta 
        ON t.id = ta.task_id 
        AND ta.user_id = ? 
        AND ta.deleted_at IS NULL
      WHERE t.id = ? 
        AND t.deleted_at IS NULL
      LIMIT 1;
    `;
    const [rows] = await this.mysql.execute(sql, [userId, userId, taskId]);
    return rows[0] || { isCreator: false, isAssigned: false };
  }
}

module.exports = TaskService;
