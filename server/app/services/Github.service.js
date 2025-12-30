const axios = require("axios");
const { getInstallationAccessToken } = require("../utils/githubAuth");
const MySQL = require("../utils/mysql.util");

class GitHubService {
  /* ================== VERIFY INSTALLATION ================== */

  static async verifyInstallationId(installationId) {
    try {
      // Nếu tạo token được => installation tồn tại
      await getInstallationAccessToken(installationId);
      return true;
    } catch (err) {
      if (err.code === "GITHUB_INSTALLATION_INVALID") {
        return false;
      }
      throw err; // lỗi khác (JWT, GitHub down...)
    }
  }

  /* ================== INSTALLATION ================== */

  static async saveInstallation(installationId, accountLogin) {
    const sql = `
      INSERT INTO github_installations (installation_id, account_login)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE account_login = VALUES(account_login);
    `;
    await MySQL.pool.query(sql, [installationId, accountLogin]);
  }

  static async linkInstallationToProject(
    projectId,
    installationId,
    accountLogin = null
  ) {
    const conn = await MySQL.pool.getConnection();
    try {
      const isValid = await this.verifyInstallationId(installationId);
      if (!isValid) {
        return new Error("GitHub installation ID không tồn tại hoặc đã bị gỡ");
      }

      await conn.beginTransaction();

      const [exists] = await conn.query(
        "SELECT 1 FROM project_installations WHERE project_id = ?",
        [projectId]
      );
      if (exists.length) {
        return new Error("This project already has an installation linked.");
      }

      const [checkInstall] = await conn.query(
        "SELECT 1 FROM github_installations WHERE installation_id = ?",
        [installationId]
      );

      if (!checkInstall.length) {
        await conn.query(
          "INSERT INTO github_installations (installation_id, account_login) VALUES (?, ?)",
          [installationId, accountLogin]
        );
      }

      await conn.query(
        `INSERT INTO project_installations (project_id, installation_id)
       VALUES (?, ?)`,
        [projectId, installationId]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      return err;
    } finally {
      conn.release();
    }
  }

  static async getInstallationByProject(projectId) {
    const [rows] = await MySQL.pool.query(
      `SELECT gi.installation_id, gi.account_login
       FROM github_installations gi
       JOIN project_installations pi ON gi.installation_id = pi.installation_id
       WHERE pi.project_id = ?
       LIMIT 1`,
      [projectId]
    );
    return rows[0] || null;
  }

  /* ================== INTERNAL HELPER ================== */

  static async _getValidTokenOrCleanup(installationId) {
    try {
      return await getInstallationAccessToken(installationId);
    } catch (err) {
      throw err;
    }
  }

  /* ================== REPOSITORIES ================== */

  static async listRepositories(installationId) {
    const token = await this._getValidTokenOrCleanup(installationId);

    const res = await axios.get(
      "https://api.github.com/installation/repositories",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return res.data.repositories;
  }

  static async saveProjectRepositories(projectId, repos) {
    if (!repos?.length) return;

    const conn = await MySQL.pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        "DELETE FROM project_repositories WHERE project_id = ?",
        [projectId]
      );

      for (const repo of repos) {
        await conn.query(
          `INSERT INTO project_repositories
           (project_id, repo_id, full_name, html_url, is_private)
           VALUES (?, ?, ?, ?, ?)`,
          [projectId, repo.id, repo.full_name, repo.html_url, repo.private]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      return err;
    } finally {
      conn.release();
    }
  }

  static async getProjectRepositories(projectId) {
    const [rows] = await MySQL.pool.query(
      "SELECT * FROM project_repositories WHERE project_id = ?",
      [projectId]
    );
    return rows;
  }

  /* ================== REPO CONTENT ================== */

  static async listRepoFiles(installationId, owner, repo, path = "") {
    const token = await this._getValidTokenOrCleanup(installationId);

    const res = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return res.data;
  }

  static async listRecentCommits(installationId, owner, repo, limit = 4) {
    const token = await this._getValidTokenOrCleanup(installationId);

    const res = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return res.data;
  }

  /* ================== BRANCHES ================== */

  static async listBranches(installationId, owner, repo) {
    const token = await this._getValidTokenOrCleanup(installationId);

    const res = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return res.data.map((b) => ({
      name: b.name,
      protected: b.protected,
      commitSha: b.commit.sha,
      url: b.commit.html_url,
    }));
  }

  /* ================== PULL REQUESTS ================== */

  static async listPullRequests(installationId, owner, repo, state = "all") {
    const token = await this._getValidTokenOrCleanup(installationId);

    const res = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return res.data.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      html_url: pr.html_url,
      user: pr.user?.login,
      avatar_url: pr.user?.avatar_url,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      merged_at: pr.merged_at,
    }));
  }

  /* ================== UNLINK ================== */

  static async unlinkInstallationFromProject(projectId) {
    const conn = await MySQL.pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query(
        "SELECT installation_id FROM project_installations WHERE project_id = ?",
        [projectId]
      );
      if (!rows.length) {
        return new Error("Không tìm thấy installation");
      }

      await conn.query(
        "DELETE FROM project_repositories WHERE project_id = ?",
        [projectId]
      );
      await conn.query(
        "DELETE FROM project_installations WHERE project_id = ?",
        [projectId]
      );

      await conn.commit();
      return { installationId: rows[0].installation_id };
    } catch (err) {
      await conn.rollback();
      return err;
    } finally {
      conn.release();
    }
  }
}

module.exports = GitHubService;
