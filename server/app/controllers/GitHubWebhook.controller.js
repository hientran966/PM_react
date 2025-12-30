const webhookService = require("../services/GitHubWebhook.service");

async function verifySignature(req, res, buf) {
  try {
    webhookService.verifySignature(req, buf);
  } catch (err) {
    console.error("Signature error:", err);
    throw err;
  }
}

async function handleWebhook(req, res) {
  try {
    const event = req.headers["x-github-event"];
    const payload = req.body;

    const result = await webhookService.processGitWebhook(event, payload);

    return res.status(200).send(result.message);
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(400).send("Invalid signature");
  }
}

module.exports = {
  verifySignature,
  handleWebhook,
};