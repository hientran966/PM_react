const express = require("express");
const comment = require("../controllers/Comment.controller");

const router = express.Router();

router.route("/")
    .get(comment.findAll)
    .post(comment.create)

router.route("/:id")
    .get(comment.findOne)
    .put(comment.update)
    .delete(comment.delete);

module.exports = router;