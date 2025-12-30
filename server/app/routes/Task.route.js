const express = require("express");
const task = require("../controllers/Task.controller");

const router = express.Router();

router.route("/")
    .get(task.findAll)
    .post(task.create)

router.route("/:id")
    .get(task.findOne)
    .put(task.update)
    .delete(task.delete);

router.route("/:id/progress")
    .post(task.logProgress);

router.route("/:id/role/:user_id")
    .get(task.getRole);

router.route("/project/:id")
    .get(task.findByProject);

router.route("/account/:id")
    .get(task.findByAccountId);

router.route("/assign/:id/:actor_id")
    .delete(task.deleteAssign);

module.exports = router;