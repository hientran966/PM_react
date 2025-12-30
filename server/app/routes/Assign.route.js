const express = require("express");
const assignment = require("../controllers/Assign.controller");

const router = express.Router();

router.route("/")
    .get(assignment.findAll)
    .post(assignment.create)

router.route("/:id")
    .get(assignment.findOne)
    .put(assignment.update)
    .delete(assignment.delete);

module.exports = router;
