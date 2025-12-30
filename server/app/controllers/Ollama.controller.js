const Ollama = require("../services/Ollama.service");
const ProjectService = require("../services/Project.service");
const TaskService = require("../services/Task.service");
const MySQL = require("../utils/mysql.util");

exports.taskCreate = async function (req, res) {
  try {
    const { projectId, userId, taskCount } = req.body;
    if (!taskCount || !projectId || !userId) {
      return res.status(400).json({ error: "Thiếu thông tin" });
    }

    const ollama = new Ollama();
    const projectService = new ProjectService(MySQL.pool);
    const taskService = new TaskService(MySQL.pool);

    const project = await projectService.findById(projectId);
    if (!project) throw new Error("Không tìm thấy dự án.");

    const taskGenPrompt = `
          Bạn là trợ lý quản lý dự án.
          Dự án: ${project.name}
          Mô tả: ${project.description || "(không có mô tả)"}
          Task hiện có: ${project.tasks || "(không có task)"}

          Hãy liệt kê ${taskCount > 0 ? taskCount : "các"} task cụ thể cần thực hiện để hoàn thành dự án này.

          Chỉ trả về JSON hợp lệ:
          [
            { "title": "Tên task 1", "description": "Mô tả ngắn" },
            { "title": "Tên task 2", "description": "Mô tả ngắn" }
          ]
          Không thêm giải thích, tiêu đề, hoặc văn bản khác ngoài JSON.
        `;

    const rawTasks = await ollama.askOllama(taskGenPrompt);

    let taskList;
    try {
      const jsonMatch = rawTasks.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (!jsonMatch)
        throw new Error("Không tìm thấy JSON hợp lệ trong phản hồi");
      taskList = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(taskList)) taskList = [taskList];
    } catch (err) {
      console.error("AI trả về không hợp lệ:\n", rawTasks);
      return rawTasks;
    }

    const createdTasks = [];
    for (const t of taskList) {
      const newTask = await taskService.create({
        title: t.title,
        description: t.description,
        start_date: new Date(),
        due_date: new Date(),
        created_by: userId,
        project_id: projectId,
      });
      createdTasks.push(newTask);
    }

    return res.json({ tasks: createdTasks });
  } catch (error) {
    console.error("Chatbot Error:", error);
    res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
  }
};

module.exports = {
  taskCreate: exports.taskCreate,
};
