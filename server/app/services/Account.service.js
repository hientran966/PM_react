const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

class AccountService {
  constructor(mysql) {
    this.mysql = mysql;
  }

  async extractAuthData(payload) {
    const auth = {
      email: payload.email,
      name: payload.name,
      role: payload.role ?? "user",
    };
    Object.keys(auth).forEach((key) => {
      if (auth[key] === undefined) delete auth[key];
    });
    return auth;
  }

  async create(payload) {
    if (!payload) throw new Error("Không có dữ liệu đầu vào");
    if (!payload.name) throw new Error("Cần có tên người dùng");
    if (!payload.email) throw new Error("Cần có email");

    const [email] = await this.mysql.execute(
      "SELECT id FROM users WHERE email = ?",
      [payload.email]
    );
    if (email.length > 0) throw new Error("Tài khoản đã tồn tại");

    const [name] = await this.mysql.execute(
      "SELECT id FROM users WHERE name = ?",
      [payload.name]
    );
    if (name.length > 0) throw new Error("Tên người dùng đã tồn tại");

    if (!payload.password) payload.password = "defaultPW";

    const auth = await this.extractAuthData(payload);
    const connection = await this.mysql.getConnection();
 
    try {
      await connection.beginTransaction();

      const hashedPassword = await bcrypt.hash(payload.password, 10);

      const [result] = await connection.execute(
        `INSERT INTO users (email, name, role, password_hash)
                VALUES (?, ?, ?, ?)`,
        [auth.email, auth.name, auth.role, hashedPassword]
      );

      await connection.commit();

      return { id: result.insertId, ...auth };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async find(filter = {}) {
    let sql = `SELECT * FROM users WHERE deleted_at IS NULL`;
    const params = [];

    if (filter.email) {
      sql += " AND email = ?";
      params.push(filter.email);
    }

    if (filter.name) {
      sql += " AND name LIKE ?";
      params.push(`%${filter.name}%`);
    }

    const [rows] = await this.mysql.execute(sql, params);
    return rows.map((row) => {
      const r = { ...row };
      delete r.password_hash;
      delete r.deleted_at;
      return r;
    });
  }

  async findById(id) {
    const [rows] = await this.mysql.execute(
      `SELECT * FROM users WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
    const user = rows[0] || null;
    if (!user) return null;
    const result = { ...user };
    delete result.password_hash;
    delete result.deleted_at;
    return result;
  }

  async update(id, payload) {
    const update = await this.extractAuthData(payload);
    let sql = "UPDATE users SET ";
    const fields = [];
    const params = [];
    for (const key in update) {
      if (key === "id") continue;
      if (key === "password") continue;
      fields.push(`${key} = ?`);
      params.push(update[key]);
    }
    if (payload.password) {
      fields.push("password_hash = ?");
      params.push(await bcrypt.hash(payload.password, 10));
      fields.push("updated_at = ?");
      params.push(new Date());
    }
    sql += fields.join(", ") + " WHERE id = ?";
    params.push(id);

    await this.mysql.execute(sql, params);
    return this.findById(id);
  }

  async delete(id) {
    const user = await this.findById(id);
    if (!user) return null;
    const deletedAt = new Date();
    await this.mysql.execute("UPDATE users SET deleted_at = ? WHERE id = ?", [
      deletedAt,
      id,
    ]);
    return { ...user, deleted_at: deletedAt };
  }

  async restore(id) {
    const [result] = await this.mysql.execute(
      "UPDATE users SET deleted_at = NULL WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  }

  async comparePassword(inputPassword, storedPassword) {
    return await bcrypt.compare(inputPassword, storedPassword);
  }

  async login(identifier, password) {
    const [rows] = await this.mysql.execute(
      "SELECT * FROM users WHERE (email = ? OR name = ?) AND deleted_at IS NULL",
      [identifier, identifier]
    );

    const auth = rows[0];
    if (!auth) throw new Error("Tài khoản không tồn tại");

    const isMatch = await this.comparePassword(password, auth.password_hash);
    if (!isMatch) throw new Error("Mật khẩu không đúng");

    const payload = {
      id: auth.id,
      email: auth.email,
      name: auth.name,
      role: auth.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    return {
      message: "Đăng nhập thành công",
      token,
      user: {
        id: auth.id,
        name: auth.name,
        email: auth.email,
        role: auth.role,
      },
    };
  }

  async getDeleted(filter = {}) {
    let sql = "SELECT * FROM users WHERE deleted_at IS NOT NULL";
    let params = [];
    if (filter.email) {
      sql += " AND email LIKE ?";
      params.push(`%${filter.email}%`);
    }
    if (filter.name) {
      sql += " AND name LIKE ?";
      params.push(`%${filter.name}%`);
    }
    const [rows] = await this.mysql.execute(sql, params);
    return rows;
  }

  async changePassword(id, oldPassword, newPassword) {
    const [rows] = await this.mysql.execute(
      "SELECT password_hash FROM users WHERE id = ?",
      [id]
    );
    if (rows.length === 0) {
      const error = new Error("Tài khoản không tồn tại");
      error.statusCode = 404;
      throw error;
    }

    const storedPassword = rows[0].password_hash;
    if (!(await this.comparePassword(oldPassword, storedPassword))) {
      const error = new Error("Mật khẩu cũ không đúng");
      error.statusCode = 400;
      throw error;
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.mysql.execute(
      "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
      [hashedNewPassword, new Date(), id]
    );

    return { message: "Đổi mật khẩu thành công" };
  }

  async getStats(userId, projectId = null) {
    if (projectId) {
      const [[tasks]] = await this.mysql.execute(
        `SELECT COUNT(DISTINCT t.id) AS count
             FROM tasks t
             INNER JOIN task_assignees ta ON ta.task_id = t.id
             WHERE ta.user_id = ? 
               AND t.project_id = ?
               AND t.deleted_at IS NULL
               AND ta.deleted_at IS NULL`,
        [userId, projectId]
      );

      const [[member]] = await this.mysql.execute(
        `SELECT role 
             FROM project_members 
             WHERE user_id = ? 
               AND project_id = ?
               AND deleted_at IS NULL
             LIMIT 1`,
        [userId, projectId]
      );

      return {
        project_id: projectId,
        role: member?.role || null,
        tasks: tasks.count || 0,
      };
    }

    const [[projects]] = await this.mysql.execute(
      `SELECT COUNT(DISTINCT project_id) AS count 
         FROM project_members 
         WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );

    const [[tasks]] = await this.mysql.execute(
      `SELECT COUNT(DISTINCT task_id) AS count 
         FROM task_assignees 
         WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );

    return {
      projects: projects.count || 0,
      tasks: tasks.count || 0,
    };
  }
}

module.exports = AccountService;