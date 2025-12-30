const { createController } = require("./controllerFactory");
const AuthService = require("../services/Account.service");
const ApiError = require("../api-error");
const MySQL = require("../utils/mysql.util");

const baseController = createController(AuthService, {
    create: "Có lỗi xảy ra khi tạo tài khoản",
    findAll: "Có lỗi xảy ra khi lấy danh sách tài khoản",
    findOne: "Có lỗi xảy ra khi lấy tài khoản",
    notFound: "Tài khoản không tồn tại",
    update: "Có lỗi xảy ra khi cập nhật tài khoản",
    delete: "Có lỗi xảy ra khi xóa tài khoản",
    restore: "Có lỗi xảy ra khi khôi phục tài khoản",
});

const customMethods = {
    login: async (req, res, next) => {
        try {
            const authService = new AuthService(MySQL.connection);
            const account = await authService.login(req.body.email, req.body.Password);
            res.send(account);
        } catch (error) {
            console.error("Login error:", error);
            next(new ApiError(401, error.message || "Đăng nhập không thành công"));
        }
    },

    getDeactive: async (req, res, next) => {
        try {
            const authService = new AuthService(MySQL.connection);
            const documents = Object.keys(req.query).length > 0
                ? await authService.getDeleted(req.query)
                : await authService.getDeleted({});
            res.send(documents);
        } catch (error) {
            console.error(error);
            return next(new ApiError(500, error.message || "Có lỗi xảy ra khi lấy danh sách tài khoản đã xóa"));
        }
    },

    changePassword: async (req, res, next) => {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return next(new ApiError(400, "Trường mật khẩu cũ và mật khẩu mới là bắt buộc"));
        }

        try {
            const authService = new AuthService(MySQL.connection);
            const result = await authService.changePassword(req.params.id, oldPassword, newPassword);
            return res.send(result);
        } catch (error) {
            console.error("Lỗi:", error);
            const statusCode = error.statusCode || 500;
            next(new ApiError(statusCode, error.message || "Có lỗi xảy ra khi đổi mật khẩu"));
        }
    },

    findByEmail: async (req, res, next) => {
        try {
            const service = new AuthService(MySQL.connection);
            const documents = await service.find({ email: req.params.email });
            return res.send(documents);
        } catch (error) {
            return next(new ApiError(500, error.message || "Đã xảy ra lỗi khi lấy công việc theo dự án"));
        }
    },

    getStats: async (req, res, next) => {
        try {
            const service = new AuthService(MySQL.connection);

            const userId = req.params.id;
            const projectId = req.query.projectId || null;

            const stats = await service.getStats(userId, projectId);

            return res.send(stats);
        } catch (error) {
            return next(new ApiError(500, error.message || "Đã xảy ra lỗi khi lấy thống kê người dùng"));
        }
    },
};

module.exports = {
    ...baseController,
    ...customMethods
};
