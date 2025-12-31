const express = require("express");
const project = require("../controllers/Project.controller");
const checkProjectMember = require("../middlewares/project.middleware");

const router = express.Router();

router.route("/")
  .get(project.findAll)
  .post(project.create);

router.route("/:id")
  .get(project.findOne)
  .put(project.update);

router.route("/:id/:actor_id")
  .delete(project.delete);

router.route("/:id/report")
  .get(project.report);

router.route("/:id/role/:user_id")
  .get(project.getRole);

router.route("/account/:id")
  .get(project.findByAccountId);

module.exports = router;