const { createController } = require("./controllerFactory");
const ActivityService = require("../services/Activity.service");
const ApiError = require("../api-error");
const MySQL = require("../utils/mysql.util");

const baseController = createController(ActivityService, {
    create: "Đã xảy ra lỗi khi tạo log hoạt động",
    findAll: "Đã xảy ra lỗi khi lấy danh sách log hoạt động",
    findOne: "Đã xảy ra lỗi khi lấy log hoạt động",
    notFound: "log hoạt động không tồn tại",
    update: "Đã xảy ra lỗi khi cập nhật log hoạt động",
    delete: "Đã xảy ra lỗi khi xóa log hoạt động",
    restore: "Đã xảy ra lỗi khi khôi phục log hoạt động"
});

const customMethods = {
    create: async (req, res, next) => {
        try {
            const service = new ActivityService(MySQL.pool);
            const document = await service.create(req.body);

            res.status(201).send(document);
        } catch (error) {
            return next(new ApiError(500, error.message || "Đã xảy ra lỗi khi tạo log hoạt động"));
        }
    },
    getByTaskId: async (req, res, next) => {
        try {
            const service = new ActivityService(MySQL.pool);
            const taskId = req.params.taskId;
            const activities = await service.find({ task_id: taskId });
            res.send(activities);
        } catch (error) {
            return next(new ApiError(500, error.message || "Đã xảy ra lỗi khi lấy log hoạt động theo task ID"));
        }
    }
};

module.exports = {
    ...baseController,
    ...customMethods
};
