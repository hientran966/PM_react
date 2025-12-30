const { createController } = require("./controllerFactory");
const NotificationService = require("../services/Notification.service");
const ApiError = require("../api-error");
const MySQL = require("../utils/mysql.util");

const baseController = createController(NotificationService, {
    create: "Đã xảy ra lỗi khi tạo thông báo",
    findAll: "Đã xảy ra lỗi khi lấy danh sách thông báo",
    findOne: "Đã xảy ra lỗi khi lấy thông báo",
    notFound: "Thông báo không tồn tại",
    update: "Đã xảy ra lỗi khi cập nhật thông báo",
    delete: "Đã xảy ra lỗi khi xóa thông báo",
    restore: "Đã xảy ra lỗi khi khôi phục thông báo"
});

const customMethods = {
    markAsRead: async (req, res, next) => {
        try {
            const service = new NotificationService(MySQL.pool);
            const document = await service.markAsRead(req.params.id);
            return res.send(document);
        } catch (error) {
            return next(new ApiError(500, error.message || "Đã xảy ra lỗi khi đánh dấu thông báo đã đọc"));
        }
    },
    markAllAsRead: async (req, res, next) => {
        try {
            const service = new NotificationService(MySQL.pool);
            const affectedRows = await service.markAllAsRead(req.params.recipient_id);
            return res.send({ affectedRows });
        } catch (error) {
            return next(new ApiError(500, error.message || "Đã xảy ra lỗi khi đánh dấu tất cả thông báo đã đọc"));
        }
    },
    markAllAsUnread: async (req, res, next) => {
        try {
            const service = new NotificationService(MySQL.pool);
            const affectedRows = await service.markAllAsUnread(req.params.recipient_id);
            return res.send({ affectedRows });
        } catch (error) {
            return next(new ApiError(500, error.message || "Đã xảy ra lỗi khi đánh dấu tất cả thông báo chưa đọc"));
        }
    },

    create: async (req, res, next) => {
        try {
            const service = new NotificationService(MySQL.pool);
            const document = await service.create(req.body);

            res.status(201).send(document);
        } catch (error) {
            return next(new ApiError(500, error.message || "Đã xảy ra lỗi khi tạo thông báo"));
        }
    },

    getNewCount: async (req, res, next) => {
        try {
            const service = new NotificationService(MySQL.pool);
            const count = await service.getNewCount(req.params.recipient_id);
            return res.send({ newCount: count });
        } catch (error) {
            return next(new ApiError(500, error.message || "Đã xảy ra lỗi khi lấy số lượng thông báo chưa đọc"));
        }
    }
};

module.exports = {
    ...baseController,
    ...customMethods
};
