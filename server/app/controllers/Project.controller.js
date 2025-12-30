const { createController } = require("./controllerFactory");
const ProjectService = require("../services/Project.service");
const ApiError = require("../api-error");
const MySQL = require("../utils/mysql.util");

const baseController = createController(ProjectService, {
    create: "Đã xảy ra lỗi khi tạo dự án",
    findAll: "Đã xảy ra lỗi khi lấy danh sách dự án",
    findOne: "Đã xảy ra lỗi khi lấy dự án",
    notFound: "Dự án không tồn tại",
    update: "Đã xảy ra lỗi khi cập nhật dự án",
    delete: "Đã xảy ra lỗi khi xóa dự án",
    deleteError: "Đã xảy ra lỗi khi xóa dự án",
    restore: "Khôi phục dự án thành công",
    restoreError: "Đã xảy ra lỗi khi khôi phục dự án",
});

const customMethods = {
    delete: async (req, res, next) => {
        try {
            const service = new ProjectService(MySQL.pool);
            const projectId = req.params.id;
            const actorId = req.params.actor_id;

            await service.delete(projectId, actorId);

            return res.send({ message: "Xóa thành công" });
        } catch (error) {
            console.error(error);
            return next(
                new ApiError(500, error.message || "Đã xảy ra lỗi khi xóa dự án")
            );
        }
    },
    findByAccountId: async (req, res, next) => {
        try {
            const service = new ProjectService(MySQL.connection);
            const documents = await service.getByUser(req.params.id);
            return res.send(documents);
        } catch (error) {
            return next(new ApiError(500, error.message || "Đã xảy ra lỗi khi lấy dự án theo tài khoản"));
        }
    },
    report: async (req, res, next) => {
        try {
            const service = new ProjectService(MySQL.connection);
            const reportData = await service.report(req.params.id);
            return res.send(reportData);
        } catch (error) {
            return next(new ApiError(500, error.message || "Đã xảy ra lỗi khi tạo báo cáo dự án"));
        }
    },
    getRole: async (req, res, next) => {
        try {
            const service = new ProjectService(MySQL.connection);
            const role = await service.getRole(req.params.id, req.params.user_id);
            return res.send(role);
        } catch (error) {
            return next(new ApiError(500, error.message || "Đã xảy ra lỗi khi lấy quyền"));
        }
    },
};

module.exports = {
    ...baseController,
    ...customMethods
};