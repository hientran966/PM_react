const { createController } = require("./controllerFactory");
const CommentService = require("../services/Comment.service");
const ApiError = require("../api-error");
const MySQL = require("../utils/mysql.util");

// CRUD mặc định từ factory
const baseController = createController(CommentService, {
    create: "Đã xảy ra lỗi khi tạo công việc",
    findAll: "Đã xảy ra lỗi khi lấy danh sách công việc",
    findOne: "Đã xảy ra lỗi khi lấy công việc",
    notFound: "Công việc không tồn tại",
    update: "Đã xảy ra lỗi khi cập nhật công việc",
    delete: "Đã xảy ra lỗi khi xóa công việc",
    restore: "Đã xảy ra lỗi khi khôi phục công việc"
});

// Thêm method đặc thù
const customMethods = {
    
};

module.exports = {
    ...baseController,
    ...customMethods
};
