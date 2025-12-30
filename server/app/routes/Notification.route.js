const express = require("express");
const notifications = require("../controllers/Notification.controller");

const router = express.Router();

router.route("/")
    .get(notifications.findAll)
    .post(notifications.create)

router.route("/:id")
    .get(notifications.findOne)
    .put(notifications.update)
    .delete(notifications.delete);

router.patch("/:id/read", notifications.markAsRead);
router.route("/recipient/:recipient_id")
    .get(notifications.getNewCount)
    .patch(notifications.markAllAsRead);
router.patch("/recipient/:recipient_id/unread", notifications.markAllAsUnread);

module.exports = router;