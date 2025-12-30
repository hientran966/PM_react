const fs = require("fs");
const path = require("path");
const NotificationService = require("./Notification.service");
const ActivityService = require("./Activity.service");
const { sendToProject } = require("../socket/index");

class FileService {
  constructor(mysql) {
    this.mysql = mysql;
  }

  async saveFileFromPayload(payload) {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let sourcePath;
    if (payload.file?.path) {
      sourcePath = payload.file.path;
    } else if (
      typeof payload.file === "string" &&
      fs.existsSync(payload.file)
    ) {
      sourcePath = payload.file;
    } else {
      throw new Error("Không tìm thấy file để lưu.");
    }

    const ext = path.extname(payload.file_name);
    const baseName = path.basename(payload.file_name, ext);
    const uniqueName = `${baseName}_${Date.now()}${ext}`;
    const destPath = path.join(uploadDir, uniqueName);
    fs.copyFileSync(sourcePath, destPath);

    return path.join("uploads", uniqueName);
  }

  async create(payload) {
    if (!payload.file_name || typeof payload.file_name !== "string") {
      throw new Error("Tên file không hợp lệ.");
    }

    const connection = await this.mysql.getConnection();
    const notificationService = new NotificationService(this.mysql);
    const activityService = new ActivityService(this.mysql);

    try {
      await connection.beginTransaction();

      let ownerId = null;

      // --- Xác định owner ---
      if (payload.project_id) {
        const [projRows] = await connection.execute(
          "SELECT created_by FROM projects WHERE id = ? AND deleted_at IS NULL",
          [payload.project_id]
        );
        if (projRows.length > 0) ownerId = projRows[0].created_by;
      }

      if (!ownerId && payload.task_id) {
        const [taskRows] = await connection.execute(
          "SELECT created_by FROM tasks WHERE id = ? AND deleted_at IS NULL",
          [payload.task_id]
        );
        if (taskRows.length > 0) ownerId = taskRows[0].created_by;
      }

      // --- Lưu file vật lý ---
      let file_url = null;
      if (payload.file) {
        file_url = await this.saveFileFromPayload(payload);
      }

      const fileType = path
        .extname(payload.file_name)
        .replace(".", "")
        .toLowerCase();

      // --- Tạo file ---
      const [fileResult] = await connection.execute(
        `INSERT INTO files (file_name, project_id, task_id, created_by)
                VALUES (?, ?, ?, ?)`,
        [
          payload.file_name,
          payload.project_id ?? null,
          payload.task_id ?? null,
          payload.created_by ?? null,
        ]
      );
      const fileId = fileResult.insertId;

      // --- Tạo version đầu tiên ---
      const [verResult] = await connection.execute(
        `INSERT INTO file_versions (file_id, version_number, file_url, file_type)
                VALUES (?, 1, ?, ?)`,
        [fileId, file_url, fileType]
      );

      const versionId = verResult.insertId;

      // --- Gửi thông báo ---
      if (ownerId && Number(ownerId) !== Number(payload.created_by)) {
        await notificationService.create(
          {
            actor_id: payload.created_by,
            recipient_id: ownerId,
            type: "file_uploaded",
            reference_type: payload.task_id ? "task" : "project",
            reference_id: payload.task_id ?? payload.project_id,
          },
          connection
        );
      }

      // --- Chuẩn hóa dữ liệu trả về ---
      const baseUrl = process.env.BASE_URL || "http://localhost:3000";

      const fileData = {
        id: fileId,
        file_name: payload.file_name,
        project_id: payload.project_id ?? null,
        task_id: payload.task_id ?? null,
        created_by: payload.created_by ?? null,
        created_at: new Date(),
        versions: [
          {
            id: versionId,
            file_id: fileId,
            version_number: 1,
            file_url: file_url
              ? `${baseUrl}/${file_url.replace(/\\/g, "/")}`
              : null,
            file_type: fileType,
          },
        ],
      };

      if (payload.project_id) {
        sendToProject(payload.project_id, "file", {
          action: "create",
          data: {
            ...fileData,
          },
        });
      }

      if (payload.task_id) {
        await activityService.create({
          task_id: payload.task_id ?? null,
          actor_id: payload.created_by ?? null,
          detail: `Tải lên file: ${payload.file_name}`,
        }, connection);
      }

      await connection.commit();

      return fileData;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async addVersion(fileId, payload) {
    const connection = await this.mysql.getConnection();
    const activityService = new ActivityService(this.mysql);

    try {
      await connection.beginTransaction();

      // --- Kiểm tra file tồn tại ---
      const [fileRows] = await connection.execute(
        "SELECT id, file_name, project_id, task_id, created_by FROM files WHERE id = ? AND deleted_at IS NULL",
        [fileId]
      );

      if (fileRows.length === 0) {
        throw new Error("File không tồn tại");
      }

      const fileInfo = fileRows[0];

      // --- Lưu file vật lý ---
      const file_url = await this.saveFileFromPayload(payload);
      const fileType = path.extname(payload.file_name).replace(".", "").toLowerCase();

      // --- Lấy version hiện tại ---
      const [verCount] = await connection.execute(
        "SELECT COUNT(*) AS count FROM file_versions WHERE file_id = ? AND deleted_at IS NULL",
        [fileId]
      );

      const version = verCount[0].count + 1;

      // --- Tạo version mới ---
      const [verResult] = await connection.execute(
        `INSERT INTO file_versions (file_id, version_number, file_url, file_type)
          VALUES (?, ?, ?, ?)`,
        [fileId, version, file_url, fileType]
      );

      const versionId = verResult.insertId;

      const baseUrl = process.env.BASE_URL || "http://localhost:3000";

      const versionData = {
        id: versionId,
        file_id: fileId,
        version_number: version,
        file_url: `${baseUrl}/${file_url.replace(/\\/g, "/")}`,
        file_type: fileType,
      };

      // --- Gửi socket cập nhật ---
      if (fileInfo.project_id) {
        sendToProject(fileInfo.project_id, "file", {
          action: "update",
          data: {
            file_id: fileId,
            version: versionData,
          },
        });
      }

      // --- Ghi activity vào task ---
      if (fileInfo.task_id) {
        await activityService.create({
          task_id: fileInfo.task_id,
          actor_id: fileInfo.created_by ?? null,
          detail: `Thêm phiên bản mới cho file: ${fileInfo.file_name}`,
        }, connection);
      }

      await connection.commit();

      return versionData;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async updateAvatar(userId, payload) {
    const connection = await this.mysql.getConnection();
    try {
      await connection.beginTransaction();

      const file_url = await this.saveFileFromPayload(payload);
      const fileType = path
        .extname(payload.file_name)
        .replace(".", "")
        .toLowerCase();

      const [userRows] = await connection.execute(
        `SELECT name FROM users WHERE id = ? LIMIT 1`,
        [userId]
      );

      if (userRows.length === 0) {
        throw new Error(`Không tìm thấy người dùng với id = ${userId}`);
      }

      const userName = userRows[0].name || `user_${userId}`;

      const [rows] = await connection.execute(
        `SELECT id FROM files 
       WHERE created_by = ? 
         AND deleted_at IS NULL 
         AND category = 'user_avatar'`,
        [userId]
      );

      let fileId;

      if (rows.length > 0) {
        fileId = rows[0].id;

        const [verCount] = await connection.execute(
          `SELECT COUNT(*) as count FROM file_versions 
         WHERE file_id = ? AND deleted_at IS NULL`,
          [fileId]
        );
        const version = verCount[0].count + 1;

        await connection.execute(
          `INSERT INTO file_versions (file_id, version_number, file_url, file_type)
         VALUES (?, ?, ?, ?)`,
          [fileId, version, file_url, fileType]
        );
      } else {
        const [fileRes] = await connection.execute(
          `INSERT INTO files (file_name, category, created_by, project_id, task_id)
         VALUES (?, 'user_avatar', ?, NULL, NULL)`,
          [userName, userId]
        );
        fileId = fileRes.insertId;

        await connection.execute(
          `INSERT INTO file_versions (file_id, version_number, file_url, file_type)
         VALUES (?, 1, ?, ?)`,
          [fileId, file_url, fileType]
        );
      }

      await connection.commit();
      return { file_id: fileId, file_url };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async getAvatar(userId) {
    const [rows] = await this.mysql.execute(
      `SELECT fv.file_url, fv.file_type, fv.created_at
            FROM files f
            JOIN file_versions fv ON fv.file_id = f.id
            WHERE f.created_by = ? AND f.category = 'user_avatar' AND fv.deleted_at IS NULL
            ORDER BY fv.version_number DESC
            LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) return null;

    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const file = rows[0];
    file.file_url = `${baseUrl}/${file.file_url.replace(/\\/g, "/")}`;

    return file;
  }

  async find(filter = {}) {
    let sql = `
            SELECT 
                f.*,
                (
                  SELECT JSON_OBJECT(
                      'id', fv.id,
                      'file_id', fv.file_id,
                      'version_number', fv.version_number,
                      'file_url', fv.file_url,
                      'file_type', fv.file_type
                  )
                  FROM file_versions fv
                  WHERE fv.file_id = f.id
                  ORDER BY fv.version_number DESC
                  LIMIT 1
                ) AS latest_version
              FROM files f
              WHERE f.deleted_at IS NULL
          `;

    const params = [];

    if (filter.id) {
      sql += " AND f.id LIKE ?";
      params.push(`%${filter.id}%`);
    }

    if (filter.file_name) {
      sql += " AND f.file_name LIKE ?";
      params.push(`%${filter.file_name}%`);
    }

    if (filter.project_id) {
      sql += " AND f.project_id = ?";
      params.push(filter.project_id);
    }

    if (filter.task_id) {
      sql += " AND f.task_id = ?";
      params.push(filter.task_id);
    }

    if (filter.created_by) {
      sql += " AND f.created_by = ?";
      params.push(filter.created_by);
    }
    const [rows] = await this.mysql.execute(sql, params);

    if (rows.length === 0) return [];

    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    for (const file of rows) {
      if (typeof file.latest_version === "string") {
        try {
          file.latest_version = JSON.parse(file.latest_version);
        } catch (err) {
          file.latest_version = null;
        }
      }

      if (file.latest_version && file.latest_version.file_url) {
        file.latest_version.file_url =
          `${baseUrl}/${file.latest_version.file_url.replace(/\\/g, "/")}`;
      }
    }
    return rows;
  }

  async findVersion(id) {
    const [rows] = await this.mysql.execute(
      "SELECT * FROM file_versions WHERE file_id = ? AND deleted_at IS NULL ORDER BY version_number ASC",
      [id]
    );

    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    for (const v of rows) {
      if (v.file_url) {
        v.file_url = `${baseUrl}/${v.file_url.replace(/\\/g, "/")}`;
      }
    }

    return rows;
  }

  async findById(id) {
    const [rows] = await this.mysql.execute(
      "SELECT * FROM files WHERE id = ? AND deleted_at IS NULL",
      [id]
    );

    if (rows.length === 0) return null;

    const file = rows[0];

    const [versions] = await this.mysql.execute(
      "SELECT * FROM file_versions WHERE file_id = ? AND deleted_at IS NULL",
      [id]
    );

    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    file.versions = versions.map((v) => ({
      ...v,
      file_url: v.file_url
        ? `${baseUrl}/${v.file_url.replace(/\\/g, "/")}`
        : null,
    }));

    return file;
  }

  async getRole(fileId, userId) {
    const sql = `
      SELECT
        CASE WHEN f.created_by = ? THEN TRUE ELSE FALSE END AS isCreator,
        CASE WHEN ta.id IS NOT NULL THEN TRUE ELSE FALSE END AS isAssigned
      FROM files f
      LEFT JOIN task_assignees ta 
        ON f.task_id = ta.task_id 
        AND ta.user_id = ? 
        AND ta.deleted_at IS NULL
      WHERE f.id = ? 
        AND f.deleted_at IS NULL
      LIMIT 1;
    `;
    const [rows] = await this.mysql.execute(sql, [userId, userId, fileId]);

    return rows[0] || { isCreator: false, isAssigned: false };
  }
}

module.exports = FileService;
