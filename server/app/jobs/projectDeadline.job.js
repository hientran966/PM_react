const cron = require("node-cron");
const dayjs = require("dayjs");
const MySQL = require("../utils/mysql.util");
const NotificationService = require("../services/Notification.service");

const notificationService = new NotificationService(MySQL.pool);

async function checkProjectDeadlines() {
  try {
    const projects = await MySQL.query(`
      SELECT id, name, end_date, created_by
      FROM projects
      WHERE deleted_at IS NULL AND status LIKE 'Đang tiến hành'
    `);

    for (const project of projects) {
      const daysLeft = dayjs(project.end_date).diff(dayjs(), "day");
      let message = null;

      if (daysLeft === 3) message = `Dự án "${project.name}" còn 3 ngày đến hạn.`;
      else if (daysLeft === 1) message = `Dự án "${project.name}" còn 1 ngày đến hạn.`;
      else if (daysLeft === 0) message = `Hôm nay là hạn cuối của dự án "${project.name}".`;
      else if (daysLeft < 0) message = `Dự án "${project.name}" đã trễ hạn ${Math.abs(daysLeft)} ngày.`;

      if (!message) continue;

      const owners = await MySQL.query(
        `SELECT user_id FROM project_members 
         WHERE project_id = ? AND role = 'owner' AND deleted_at IS NULL`,
        [project.id]
      );

      for (const owner of owners) {
        await notificationService.create({
          recipient_id: owner.user_id,
          actor_id: project.created_by || 0,
          type: "deadline_warning", 
          reference_type: "project",
          reference_id: project.id,
          message: message
        });

        console.log(`Notification created for user ${owner.user_id}: ${message}`);
      }
    }
  } catch (err) {
    console.error("Error in projectDeadlineJob:", err);
  }
}

// Cron job chạy 5h sáng mỗi ngày
cron.schedule("0 5 * * *", checkProjectDeadlines, {
  timezone: "Asia/Ho_Chi_Minh",
});

module.exports = { checkProjectDeadlines };