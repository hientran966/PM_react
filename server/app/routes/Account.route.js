const express = require("express");
const auth = require("../controllers/Account.controller");

const router = express.Router();

router.route("/")
    .get(auth.findAll)
    .post(auth.create)

router.route("/deactive/:id")
    .put(auth.restore)

router.route("/deactive")
    .get(auth.getDeactive)

router.route("/login")
    .post(auth.login);

router.route("/:id")
    .get(auth.findOne)
    .put(auth.update)
    .delete(auth.delete);

router.route("/:id/stats")
    .get(auth.getStats);

router.route("/:id/password")
    .put(auth.changePassword);

router.route("/email/:email")
    .get(auth.findByEmail);

module.exports = router;