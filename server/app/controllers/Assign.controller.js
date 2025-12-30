const { createController } = require("./controllerFactory");
const AssignmentService = require("../services/Assign.service");
const ApiError = require("../api-error");
const MySQL = require("../utils/mysql.util");

const baseController = createController(AssignmentService, {
    create: "Đã xảy ra lỗi khi tạo phân công",
    findAll: "Đã xảy ra lỗi khi lấy danh sách phân công",
    findOne: "Đã xảy ra lỗi khi lấy phân công",
    notFound: "Phân công không tồn tại",
    update: "Đã xảy ra lỗi khi cập nhật phân công",
    delete: "Đã xảy ra lỗi khi xóa phân công",
    restore: "Đã xảy ra lỗi khi khôi phục phân công",
    deleteAll: "Đã xảy ra lỗi khi xóa tất cả phân công"
});

const customMethods = {
    // validate riêng cho create
    create: async (req, res, next) => {
        if (!req.body.user_id) {
            return next(new ApiError(400, "Người nhận không được để trống"));
        }
        if (!req.body.task_id) {
            return next(new ApiError(400, "Công việc không được để trống"));
        }
        try {
            const service = new AssignmentService(MySQL.pool);
            const document = await service.create(req.body);
            return res.send(document);
        } catch (error) {
            return next(new ApiError(500, error.message || "Đã xảy ra lỗi khi tạo phân công"));
        }
    },

};

module.exports = {
    ...baseController,
    ...customMethods
};