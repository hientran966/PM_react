const { createController } = require("./controllerFactory");
const ChatService = require("../services/Chat.service");
const ApiError = require("../api-error");
const MySQL = require("../utils/mysql.util");

const baseController = createController(ChatService, {
  create: "Đã xảy ra lỗi khi tạo kênh chat",
  findAll: "Đã xảy ra lỗi khi lấy danh sách kênh chat",
  findOne: "Đã xảy ra lỗi khi lấy kênh chat",
  notFound: "Kênh chat không tồn tại",
  update: "Đã xảy ra lỗi khi cập nhật kênh chat",
  delete: "Đã xảy ra lỗi khi xóa kênh chat",
  restore: "Đã xảy ra lỗi khi khôi phục kênh chat",
});

const customMethods = {
  create: async (req, res, next) => {
    try {
      const service = new ChatService(MySQL.pool);
      const document = await service.create(req.body);
      res.status(201).send(document);
    } catch (error) {
      next(new ApiError(500, error.message || "Đã xảy ra lỗi khi tạo kênh chat"));
    }
  },

  getById: async (req, res, next) => {
    try {
      const service = new ChatService(MySQL.pool);
      const channel = await service.findById(req.params.id);
      if (!channel) return next(new ApiError(404, "Kênh chat không tồn tại"));
      res.send(channel);
    } catch (error) {
      next(new ApiError(500, error.message || "Lỗi khi lấy kênh chat theo ID"));
    }
  },

  getByUserId: async (req, res, next) => {
    try {
      const service = new ChatService(MySQL.pool);
      const channels = await service.getByUserId(req.params.user_id, req.params.project_id);
      res.send(channels);
    } catch (error) {
      next(new ApiError(500, error.message || "Lỗi khi lấy kênh chat theo ID người dùng"));
    }
  },

  findByProject: async (req, res, next) => {
    try {
      const service = new ChatService(MySQL.pool);
      const result = await service.find({ project_id: req.params.project_id });
      res.send(result);
    } catch (error) {
      next(new ApiError(500, error.message || "Đã xảy ra lỗi khi lấy danh sách kênh theo dự án"));
    }
  },

  addMember: async (req, res, next) => {
    try {
      const service = new ChatService(MySQL.pool);
      const { channel_id, user_id } = req.body;
      const result = await service.addMember(channel_id, user_id);
      res.status(201).send(result);
    } catch (error) {
      next(new ApiError(500, error.message || "Đã xảy ra lỗi khi thêm thành viên vào kênh"));
    }
  },

  removeMember: async (req, res, next) => {
    try {
      const service = new ChatService(MySQL.pool);
      const { channel_id, user_id } = req.body;
      const result = await service.removeMember(channel_id, user_id);
      res.send(result);
    } catch (error) {
      next(new ApiError(500, error.message || "Đã xảy ra lỗi khi xóa thành viên khỏi kênh"));
    }
  },

  getMembers: async (req, res, next) => {
    try {
      const service = new ChatService(MySQL.pool);
      const members = await service.getMembers(req.params.channel_id);
      res.send(members);
    } catch (error) {
      next(new ApiError(500, error.message || "Đã xảy ra lỗi khi lấy danh sách thành viên kênh"));
    }
  },

  addMessage: async (req, res, next) => {
    try {
      const service = new ChatService(MySQL.pool);
      const message = await service.addMessage(req.body);
      res.status(201).send(message);
    } catch (error) {
      next(new ApiError(500, error.message || "Đã xảy ra lỗi khi gửi tin nhắn"));
    }
  },

  addMessageWithFiles: async (req, res, next) => {
    try {
      const service = new ChatService(MySQL.pool);

      const { channel_id, sender_id, parent_id, content, project_id, task_id } = req.body;

      const files = (req.files || []).map((f) => ({
        file_name: f.originalname,
        file: f,
        project_id: project_id || null,
        task_id: task_id || null,
      }));

      const message = await service.addMessageWithFiles({
        channel_id,
        sender_id,
        parent_id,
        content,
        files,
      });

      res.status(201).send(message);
    } catch (error) {
      console.error("addMessageWithFiles error:", error);
      next(new ApiError(500, error.message || "Đã xảy ra lỗi khi gửi tin nhắn kèm file"));
    }
  },

  getMessages: async (req, res, next) => {
    try {
      const service = new ChatService(MySQL.pool);
      const { limit, offset } = req.query;
      const messages = await service.getMessages(req.params.channel_id, {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
      });
      res.send(messages);
    } catch (error) {
      next(new ApiError(500, error.message || "Đã xảy ra lỗi khi lấy danh sách tin nhắn"));
    }
  },

  getMessageChannel: async (req, res, next) => {
    try {
      const service = new ChatService(MySQL.pool);
      const channel = await service.getMessageChannel(req.params.id);
      if (!channel) return next(new ApiError(404, "Kênh chat không tồn tại"));
      res.send(channel
      );
    } catch (error) {
      next(new ApiError(500, error.message || "Lỗi khi lấy kênh chat theo ID tin nhắn"));
    }
  },

  addMentions: async (req, res, next) => {
    try {
      const service = new ChatService(MySQL.pool);
      const { message_id, mentioned_user_ids, actor_id } = req.body;
      const result = await service.addMentions(message_id, mentioned_user_ids, actor_id);
      res.status(201).send(result || { success: true });
    } catch (error) {
      next(new ApiError(500, error.message || "Đã xảy ra lỗi khi thêm người được nhắc"));
    }
  },
};

module.exports = {
  ...baseController,
  ...customMethods,
};
