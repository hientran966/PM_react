const express = require("express");
const router = express.Router();
const chatController = require("../controllers/Chat.controller");
const upload = require("../middlewares/upload.middleware");

// --- Channel ---
// Channel routes (more-specific before generic when applicable)
router.post("/", chatController.create);
router.get("/", chatController.findAll);
router.get("/project/:project_id/user/:user_id", chatController.getByUserId);
router.get("/project/:project_id", chatController.findByProject);
// --- Members ---
// Member routes
router.get("/:channel_id/members", chatController.getMembers);
router.post("/member", chatController.addMember);
router.delete("/member", chatController.removeMember);

// --- Messages ---
// Message routes
router.post("/message", chatController.addMessage);
router.post("/message/files", upload.array("files"), chatController.addMessageWithFiles);
router.get("/message/:id/channel", chatController.getMessageChannel);
router.get("/:channel_id/messages", chatController.getMessages);

// --- Mentions ---
router.post("/mentions", chatController.addMentions);

// Generic channel routes (place after specific routes to avoid collisions)
router.get("/:id", chatController.getById);
router.patch("/restore/:id", chatController.restore);
router.put("/:id", chatController.update);
router.delete("/:id", chatController.delete);

module.exports = router;