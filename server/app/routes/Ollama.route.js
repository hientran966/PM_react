const express = require("express");
const router = express.Router();
const OllamaController = require("../controllers/Ollama.controller");

router.post("/", OllamaController.taskCreate);

module.exports = router;
