const MySQL = require("../utils/mysql.util");

async function checkProjectMember(req, res, next) {
  try {
    const userId = req.user?.id;

    const projectId =
      req.params.id ||
      req.body.project_id ||
      req.query.project_id;

    if (!userId) {
      return res.status(401).json({
        message: "Chưa xác thực người dùng",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        message: "Thiếu project id",
      });
    }

    const rows = await MySQL.query(
      `
      SELECT 1
      FROM project_members pm
      JOIN projects p
        ON pm.project_id = p.id
      WHERE pm.project_id = ?
        AND pm.user_id = ?
        AND pm.status = 'accepted'
        AND pm.deleted_at IS NULL
        AND p.deleted_at IS NULL
      LIMIT 1
      `,
      [projectId, userId]
    );

    if (!rows.length) {
      return res.status(403).json({
        message: "Bạn không có quyền truy cập dự án này",
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = checkProjectMember;
