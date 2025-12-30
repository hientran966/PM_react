// routes/GitHubWebhook.route.js
const express = require("express");
const router = express.Router();

const {
  verifySignature,
  handleWebhook,
} = require("../controllers/GitHubWebhook.controller.js");

router.post(
  "/webhook",
  express.json({ verify: verifySignature }),
  handleWebhook
);

module.exports = router;