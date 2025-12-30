// controllerFactory.js
const ApiError = require("../api-error");
const MySQL = require("../utils/mysql.util");

function createController(ServiceClass, messages = {}) {
    const getService = () => new ServiceClass(MySQL.pool || MySQL.connection);

    return {
        // Tạo mới
        create: async (req, res, next) => {
            try {
                const service = getService();
                const document = await service.create(req.body);
                return res.send(document);
            } catch (error) {
                console.error(error);
                return next(
                    new ApiError(500, error.message || messages.create || "Đã xảy ra lỗi khi tạo")
                );
            }
        },

        // Lấy tất cả
        findAll: async (req, res, next) => {
            let documents = [];
            try {
                const service = getService();
                if (Object.keys(req.query).length > 0) {
                    documents = await service.find(req.query);
                } else {
                    documents = await service.find({});
                }

                if (!documents || documents === []) {
                    return next(
                        new ApiError(403, "Không tìm thấy")
                    );
                }
                return res.send(documents);
            } catch (error) {
                console.error(error);
                return next(
                    new ApiError(500, error.message || messages.findAll || "Đã xảy ra lỗi khi lấy danh sách")
                );
            }
        },

        // Lấy theo id
        findOne: async (req, res, next) => {
            try {
                const service = getService();
                const document = await service.findById(req.params.id);
                if (!document) {
                    return next(new ApiError(404, messages.notFound || "Không tồn tại"));
                }
                return res.send(document);
            } catch (error) {
                console.error(error);
                return next(
                    new ApiError(500, error.message || messages.findOne || "Đã xảy ra lỗi khi lấy dữ liệu")
                );
            }
        },

        // Cập nhật
        update: async (req, res, next) => {
            try {
                const service = getService();
                const document = await service.update(req.params.id, req.body);
                return res.send(document);
            } catch (error) {
                console.error(error);
                return next(
                    new ApiError(500, error.message || messages.update || "Đã xảy ra lỗi khi cập nhật")
                );
            }
        },

        // Xóa
        delete: async (req, res, next) => {
            try {
                const service = getService();
                await service.delete(req.params.id);
                return res.send({ message: "Xóa thành công" });
            } catch (error) {
                console.error(error);
                return next(
                    new ApiError(500, error.message || messages.deleteError || "Đã xảy ra lỗi khi xóa")
                );
            }
        },

        // Khôi phục
        restore: async (req, res, next) => {
            try {
                const service = getService();
                await service.restore(req.params.id);
                return res.send({ message: "Khôi phục thành công" });
            } catch (error) {
                console.error(error);
                return next(
                    new ApiError(500, error.message || messages.restoreError || "Đã xảy ra lỗi khi khôi phục")
                );
            }
        }
    };
}

module.exports = { createController };
