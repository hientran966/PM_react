const { createController } = require("./controllerFactory");
const FileService = require("../services/File.service");
const ApiError = require("../api-error");
const MySQL = require("../utils/mysql.util");

const baseController = createController(FileService, {
    findAll: "Đã xảy ra lỗi khi lấy danh sách file",
    findOne: "Đã xảy ra lỗi khi lấy file",
    notFound: "File không tồn tại",
    update: "Đã xảy ra lỗi khi cập nhật file",
    delete: "Đã xảy ra lỗi khi xóa file",
    deleteSuccess: "Xóa file thành công",
    deleteAllSuccess: "Xóa tất cả file thành công"
});

// custom methods
const customMethods = {
    create: async (req, res, next) => {
        try {
            const decodedName = Buffer.from(req.file.originalname, "latin1").toString("utf8");
            const payload = {
            file_name: decodedName || req.body.file_name,
            file: req.file || req.body.file,
            project_id: req.body.project_id,
            task_id: req.body.task_id,
            created_by: req.body.created_by
            };

            const service = new FileService(MySQL.pool);
            const result = await service.create(payload);
            return res.json({ message: "Tạo file thành công", result });
        } catch (err) {
            console.error(err);
            return next(new ApiError(500, "Đã xảy ra lỗi khi tạo file"));
        }
    },
    findAllVersion: async (req, res, next) => {
        try {
            const service = new FileService(MySQL.connection);
            const docs = await service.findVersion(req.params.id);
            if (!docs) return next(new ApiError(404, "File không tồn tại"));
            return res.json(docs);
        } catch (err) {
            console.error(err);
            return next(new ApiError(500, "Đã xảy ra lỗi khi lấy tất cả phiên bản file"));
        }
    },

    findVersion: async (req, res, next) => {
        try {
            const service = new FileService(MySQL.connection);
            const doc = await service.findVersionById(req.params.id);
            if (!doc) return next(new ApiError(404, "File không tồn tại"));
            return res.json(doc);
        } catch (err) {
            console.error(err);
            return next(new ApiError(500, "Đã xảy ra lỗi khi lấy phiên bản file"));
        }
    },

    addVersion: async (req, res, next) => {
        try {
            if (!req.file) {
            return next(new ApiError(400, "Thiếu file upload"));
            }

            const decodedName = Buffer.from(req.file.originalname, "latin1").toString("utf8");
            const payload = {
            file_name: decodedName || req.file.originalname,
            file: req.file.path,
            };

            const service = new FileService(MySQL.pool);
            const result = await service.addVersion(req.params.id, payload);
            return res.json({ message: "Thêm phiên bản thành công", result });
        } catch (err) {
            console.error(err);
            return next(new ApiError(500, "Đã xảy ra lỗi khi thêm phiên bản file"));
        }
    },

    uploadAvatar: async (req, res, next) => {
        if (!req.file) {
            return next(new ApiError(400, "Thiếu file upload"));
        }

        try {
            const service = new FileService(MySQL.pool);
            const result = await service.updateAvatar(req.params.id, {
                file_name: req.file.originalname,
                file: req.file.path,
            });
            return res.json({ message: "Cập nhật ảnh đại diện thành công", result });
        } catch (err) {
            console.error(err);
            return next(new ApiError(500, "Đã xảy ra lỗi khi cập nhật avatar"));
        }
    },

    getAvatar: async (req, res, next) => {
        try {
            const service = new FileService(MySQL.pool);
            const avatar = await service.getAvatar(req.params.id);

            return res.json(avatar);
        } catch (err) {
            console.error(err);
            return next(new ApiError(500, "Đã xảy ra lỗi khi lấy avatar"));
        }
    },
    getRole: async (req, res, next) => {
        try {
            const service = new FileService(MySQL.connection);
            const role = await service.getRole(req.params.id, req.params.user_id);
            return res.send(role);
        } catch (error) {
            return next(new ApiError(500, error.message || "Đã xảy ra lỗi khi lấy quyền"));
        }
    },
};

module.exports = { ...baseController, ...customMethods };