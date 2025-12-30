const express = require("express");
const cors = require("cors");
const path = require("path");
const ApiError = require("./app/api-error");
const { verifyToken } = require("./app/middlewares/auth.middleware");

const authRouter = require("./app/routes/Account.route");
const projectRouter = require("./app/routes/Project.route");
const memberRouter = require("./app/routes/Member.route");
const taskRouter = require("./app/routes/Task.route");
const logRouter = require("./app/routes/Activity.route");
const assignmentRouter = require("./app/routes/Assign.route");
const commentRouter = require("./app/routes/Comment.route");
const notificationRouter = require("./app/routes/Notification.route");
const fileRouter = require("./app/routes/File.route");
const chatRouter = require("./app/routes/Chat.route")
const ollamaRouter = require("./app/routes/Ollama.route");
const githubRoutes = require("./app/routes/Github.route");
const githubWebhookRouter = require("./app/routes/GithubWebhook.route");

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', cors(), express.static(path.join(__dirname, 'uploads')));

app.get("/", (req, res) => {
    res.json({ message: "Ứng dụng quản lý công việc."});
});
// Import routes
app.use("/api/auth", authRouter);
app.use("/api/github", githubWebhookRouter);

//app.use(verifyToken);
app.use("/api/projects", projectRouter);
app.use("/api/members", memberRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/logs", logRouter);
app.use("/api/assigns", assignmentRouter);
app.use("/api/comments", commentRouter);
app.use("/api/noti", notificationRouter);
app.use("/api/file", fileRouter);
app.use("/api/chat", chatRouter)
app.use("/api/ai", ollamaRouter);

app.get("/api/github/callback", (req, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});
app.use("/api/github", githubRoutes);

//handle 404
app.use((req, res, next) => {
    //
    return next(new ApiError(404, "Resource not found"));
});

//error handling
app.use((err, req, res, next) => {
  if (err.code === "GITHUB_INSTALLATION_INVALID") {
    return res.status(400).json({
      message: err.message,
      code: err.code,
    });
  }

  console.error("Unhandled error:", err);

  res.status(500).json({
    message: "Internal server error",
  });
});


module.exports = app;