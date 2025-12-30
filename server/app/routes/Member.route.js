const express = require("express");
const member = require("../controllers/Member.controller");

const router = express.Router();

router.route("/")
    .get(member.findAll)
    .post(member.create)

router.route("/:id")
    .get(member.findOne)
    .put(member.update)
    .delete(member.delete);

router.route("/:id/accept")
    .post(member.acceptInvite);
router.route("/:id/decline")
    .post(member.declineInvite);

router.route("/user/:id")
    .get(member.getInviteList);

router.route("/project/:id")
    .get(member.getByProjectId);

router.route("/check/:project_id/:user_id")
    .get(member.checkIfMemberExists);

module.exports = router;