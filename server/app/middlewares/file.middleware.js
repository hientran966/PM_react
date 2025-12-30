const MySQL = require("../utils/mysql.util");

async function checkFileViewer(req, res, next) {
  try {
    const userId = req.user?.id;

    const fileId =
      req.params.fileId ||
      req.params.id ||
      req.query.file_id ||
      req.body.file_id;

    if (!userId) {
      return res.status(401).json({
        message: "Chưa xác thực người dùng",
      });
    }

    if (!fileId) {
      return res.status(400).json({
        message: "Thiếu file id",
      });
    }

    const rows = await MySQL.query(
      `
      SELECT 1
      FROM files f
      LEFT JOIN tasks t 
        ON f.task_id = t.id 
        AND t.deleted_at IS NULL
      LEFT JOIN project_members pm
        ON pm.project_id = COALESCE(f.project_id, t.project_id)
        AND pm.user_id = ?
        AND pm.status = 'accepted'
        AND pm.deleted_at IS NULL
      WHERE f.id = ?
        AND f.deleted_at IS NULL
        AND pm.deleted_at IS NULL
        AND (
          f.created_by = ?
          OR pm.id IS NOT NULL
        )
      LIMIT 1
      `,
      [userId, fileId, userId]
    );

    if (!rows.length) {
      return res.status(403).json({
        message: "Bạn không có quyền xem file này",
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = checkFileViewer;