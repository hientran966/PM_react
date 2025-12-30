require("dotenv").config();
const fetch = require("node-fetch");

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;

if (!OLLAMA_BASE_URL || !OLLAMA_MODEL) {
  throw new Error("Thiếu cấu hình OLLAMA trong file .env");
}

const OLLAMA_API = `${OLLAMA_BASE_URL}/api/generate`;

class Ollama {
    constructor() {}

    async askOllama(prompt) {
        try {
            const response = await fetch(OLLAMA_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    prompt,
                    stream: false
                }),
            });

            const result = await response.json();
            return result.response;
        } catch (error) {
            console.error("Error calling Ollama:", error);
            throw new Error("Không thể kết nối Ollama");
        }
    }
}

module.exports = Ollama;