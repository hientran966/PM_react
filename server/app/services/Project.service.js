const MemberService = require("./Member.service");
const NotificationService = require("./Notification.service");
const ChatService = require("./Chat.service");

class ProjectService {
  constructor(mysql) {
    this.mysql = mysql;
    this.memberService = new MemberService(mysql);
    this.notificationService = new NotificationService(mysql);
    this.chatService = new ChatService(mysql);
  }

  async extractProjectData(payload) {
    return {
      name: payload.name ?? null,
      description: payload.description ?? null,
      start_date: payload.start_date ?? null,
      end_date: payload.end_date ?? null,
      status: payload.status ?? "Đang tiến hành",
      created_by: payload.created_by ?? null,
    };
  }

  formatLocalDate(date) {
    const d = new Date(date);
    const offsetMs = d.getTimezoneOffset() * 60 * 1000;
    const local = new Date(d.getTime() - offsetMs);
    return local.toISOString().slice(0, 10);
  }

  async create(payload) {
    const project = await this.extractProjectData(payload);
    const connection = await this.mysql.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        "INSERT INTO projects (name, description, start_date, end_date, status, created_by) VALUES (?, ?, ?, ?, ?, ?)",
        [
          project.name,
          project.description,
          project.start_date,
          project.end_date,
          project.status,
          project.created_by,
        ]
      );

      const projectId = result.insertId;

      await this.memberService.create(
        {
          project_id: projectId,
          user_id: project.created_by,
          role: "owner",
          status: "accepted",
        },
        connection
      );

      if (Array.isArray(payload.members) && payload.members.length > 0) {
        for (const m of payload.members) {
          if (m.user_id === project.created_by) continue;
          await this.memberService.create(
            {
              project_id: projectId,
              user_id: m.user_id,
              role: m.role ?? "member",
              invited_by: project.created_by,
              status: "invited",
            },
            connection
          );
        }
      }

      await connection.commit();
      return { id: projectId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async find(filter = {}) {
    let sql = "SELECT * FROM projects WHERE deleted_at IS NULL";
    const params = [];

    if (filter.name) {
      sql += " AND name LIKE ?";
      params.push(`%${filter.name}%`);
    }
    if (filter.status) {
      sql += " AND status = ?";
      params.push(filter.status);
    }
    if (filter.created_by) {
      sql += " AND created_by = ?";
      params.push(filter.created_by);
    }
    if (filter.start_date) {
      sql += " AND start_date >= ?";
      params.push(filter.start_date);
    }
    if (filter.end_date) {
      sql += " AND end_date <= ?";
      params.push(filter.end_date);
    }

    const [rows] = await this.mysql.execute(sql, params);
    return rows;
  }

  async findById(id) {
    const [projectRows] = await this.mysql.execute(
      "SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL",
      [id]
    );

    if (!projectRows.length) return null;
    const project = projectRows[0];

    const [tasks] = await this.mysql.execute(
      `SELECT * 
      FROM tasks 
      WHERE project_id = ? AND deleted_at IS NULL
      ORDER BY id ASC`,
      [id]
    );

    project.tasks = tasks;
    return project;
  }

  async update(id, payload) {
    const connection = await this.mysql.getConnection();
    const notificationService = this.notificationService;
    try {
      await connection.beginTransaction();

      const fields = [];
      const params = [];

      for (const key in payload) {
        if (["id", "actor_id"].includes(key)) continue;
        fields.push(`${key} = ?`);
        params.push(payload[key]);
      }

      if (fields.length === 0) {
        throw new Error("Không có trường nào để cập nhật.");
      }

      const sql = `UPDATE projects SET ${fields.join(", ")} WHERE id = ?`;
      params.push(id);

      await connection.execute(sql, params);

      const members = await this.memberService.getByProjectId(id);
      const actorId = payload.actor_id;

      for (const member of members) {
        if (member.user_id === actorId) continue;

        await notificationService.create(
          {
            actor_id: actorId,
            recipient_id: member.user_id,
            type: "project_updated",
            reference_type: "project",
            reference_id: id,
          },
          connection
        );
      }

      await connection.commit();

      return await this.findById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async delete(id, actorId) {
    const connection = await this.mysql.getConnection();
    const notificationService = this.notificationService;

    try {
      await connection.beginTransaction();

      const deletedDate = new Date().toISOString().slice(0, 19).replace("T", " ");
      await connection.execute(
        "UPDATE projects SET deleted_at = ? WHERE id = ?",
        [deletedDate, id]
      );

      const members = await this.memberService.getByProjectId(id);

      for (const member of members) {
        if (member.user_id === actorId) continue;

        await notificationService.create(
          {
            actor_id: actorId,
            recipient_id: member.user_id,
            type: "project_updated",
            reference_type: "project",
            reference_id: id,
            message: "Dự án đã bị xóa",
          },
          connection
        );
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

  async getByUser(userId) {
    const sql = `
      SELECT DISTINCT 
        p.*, 
        (
          SELECT JSON_ARRAYAGG(pm2.user_id)
          FROM project_members pm2
          WHERE pm2.project_id = p.id AND pm2.status = 'accepted' AND deleted_at IS NULL
        ) AS members
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE 
        (
          p.created_by = ? 
          OR (pm.user_id = ? AND pm.status = 'accepted')
        )
        AND pm.deleted_at IS NULL
        AND p.deleted_at IS NULL
    `;
    const [rows] = await this.mysql.execute(sql, [userId, userId]);
    return rows;
  }

  async report(projectId) {
    const [projectRows] = await this.mysql.execute(
      `SELECT id, name, start_date, end_date 
     FROM projects 
     WHERE id = ? AND deleted_at IS NULL`,
      [projectId]
    );
    if (projectRows.length === 0) throw new Error("Không tìm thấy dự án");
    const project = projectRows[0];

    const [[taskStats]] = await this.mysql.execute(
      `SELECT 
      COUNT(*) AS total_tasks,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_tasks
     FROM tasks 
     WHERE project_id = ? AND deleted_at IS NULL`,
      [projectId]
    );

    const completionRate =
      taskStats.total_tasks > 0
        ? Math.round((taskStats.done_tasks / taskStats.total_tasks) * 100)
        : 0;

    const [[memberCount]] = await this.mysql.execute(
      `SELECT COUNT(DISTINCT user_id) AS count
     FROM project_members 
     WHERE project_id = ? AND deleted_at IS NULL AND status = 'accepted'`,
      [projectId]
    );

    const [taskStatusRows] = await this.mysql.execute(
      `SELECT status, COUNT(*) AS count 
     FROM tasks 
     WHERE project_id = ? AND deleted_at IS NULL 
     GROUP BY status`,
      [projectId]
    );
    const statusMap = {
      todo: "Đang chờ",
      in_progress: "Đang tiến hành",
      review: "Review",
      done: "Đã xong",
    };
    const taskStatus = taskStatusRows.map((r) => ({
      status: statusMap[r.status] || r.status,
      count: r.count,
    }));

    const [priorityRows] = await this.mysql.execute(
      `SELECT priority, COUNT(*) AS count 
     FROM tasks 
     WHERE project_id = ? AND deleted_at IS NULL 
     GROUP BY priority`,
      [projectId]
    );
    const priorityMap = { low: "Thấp", medium: "Trung bình", high: "Cao" };
    const priority = priorityRows.map((r) => ({
      priority: priorityMap[r.priority] || r.priority,
      count: r.count,
    }));

    const [members] = await this.mysql.execute(
      `SELECT u.id, u.name 
      FROM project_members pm 
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ? 
        AND pm.deleted_at IS NULL 
        AND pm.status = 'accepted'`,
      [projectId]
    );

    const totalTasks = taskStats.total_tasks;

    const [assignedCounts] = await this.mysql.execute(
      `SELECT ta.user_id, COUNT(*) AS count
      FROM task_assignees ta
      JOIN tasks t ON ta.task_id = t.id
      WHERE t.project_id = ? 
        AND ta.deleted_at IS NULL
        AND t.deleted_at IS NULL
      GROUP BY ta.user_id`,
      [projectId]
    );

    const [[nonAssign]] = await this.mysql.execute(
      `SELECT COUNT(*) AS count
      FROM tasks t
      LEFT JOIN task_assignees ta 
          ON ta.task_id = t.id AND ta.deleted_at IS NULL
      WHERE t.project_id = ? 
        AND t.deleted_at IS NULL
        AND ta.id IS NULL`,
      [projectId]
    );

    const workloadMap = {};
    assignedCounts.forEach((row) => {
      workloadMap[row.user_id] = row.count;
    });

    const workload = members.map((m) => ({
      name: m.name,
      assigned_tasks: workloadMap[m.id] || 0,
      workload_percent:
        totalTasks > 0
          ? Math.round(((workloadMap[m.id] || 0) / totalTasks) * 100)
          : 0,
    }));

    workload.push({
      name: "non_assign",
      assigned_tasks: nonAssign.count,
      workload_percent:
        totalTasks > 0 ? Math.round((nonAssign.count / totalTasks) * 100) : 0,
    });

    const [tasks] = await this.mysql.execute(
      `SELECT id FROM tasks WHERE project_id = ? AND deleted_at IS NULL`,
      [projectId]
    );
    const taskIds = tasks.map((t) => t.id);

    const startDate = project.start_date
      ? new Date(project.start_date)
      : new Date();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = today;
    const dayDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));

    const dates = Array.from({ length: dayDiff + 1 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return this.formatLocalDate(d);
    });

    let progress_trend = [];

    if (taskIds.length > 0) {
      const [progressRows] = await this.mysql.execute(
        `
      SELECT task_id, DATE(DATE_ADD(created_at, INTERVAL 7 HOUR)) AS date, progress
      FROM (
        SELECT 
          task_id,
          created_at,
          progress,
          ROW_NUMBER() OVER (PARTITION BY task_id, DATE(CONVERT_TZ(created_at, '+00:00', '+07:00')) ORDER BY created_at DESC) AS rn
        FROM progress_logs
        WHERE task_id IN (${taskIds.map(() => "?").join(",")}) AND deleted_at IS NULL
      ) t
      WHERE rn = 1
      ORDER BY task_id, date ASC
      `,
        taskIds
      );

      const taskLogsMap = {};
      taskIds.forEach((id) => (taskLogsMap[id] = []));
      progressRows.forEach((p) => {
        const day = this.formatLocalDate(p.date);
        taskLogsMap[p.task_id].push({
          date: day,
          progress: parseFloat(p.progress),
        });
      });

      const taskProgressState = {};
      taskIds.forEach((id) => (taskProgressState[id] = 0));

      progress_trend = dates.map((d) => {
        let sum = 0;
        taskIds.forEach((taskId) => {
          const logs = taskLogsMap[taskId];
          const log = logs.find((l) => l.date === d);
          if (log) taskProgressState[taskId] = log.progress;
          sum += taskProgressState[taskId];
        });
        const normalized =
          taskIds.length > 0
            ? parseFloat((sum / taskIds.length).toFixed(1))
            : 0;
        return { date: d, progress: normalized };
      });
    }

    return {
      project,
      members,
      total_tasks: taskStats.total_tasks,
      completion_rate: completionRate,
      member_count: memberCount.count,
      task_status: taskStatus,
      priority: priority,
      workload,
      progress_trend,
    };
  }

  async getRole(projectId, userId) {
    const sql = `
            SELECT role
            FROM project_members
            WHERE project_id = ? AND user_id = ? AND deleted_at IS NULL AND status = 'accepted'
            LIMIT 1;
        `;
    const [rows] = await this.mysql.execute(sql, [projectId, userId]);
    return rows[0];
  }
}

module.exports = ProjectService;
