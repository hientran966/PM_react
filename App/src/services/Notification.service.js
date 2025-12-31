import createApiClient from "./api.service";

class NotificationService {
    constructor(baseUrl = "/api/noti") {
        this.api = createApiClient(baseUrl);
    }

    async createNotification(data) {
        return (await this.api.post("/", data)).data;
    }

    async getNotificationById(id) {
        return (await this.api.get(`/${id}`)).data;
    }

    async updateNotification(id, data) {
        return (await this.api.put(`/${id}`, data)).data;
    }

    async deleteNotification(id) {
        return (await this.api.delete(`/${id}`)).data;
    }

    async getAllNotifications(filter = {}) {
    return (await this.api.get("/", { params: filter })).data;
    }

    async markAsRead(id) {
        return (await this.api.patch(`/${id}/read`)).data;
    }

    async markAllAsRead(recipient_id) {
        return (await this.api.patch(`/recipient/${recipient_id}`)).data;
    }

    async markAllAsUnread(recipient_id) {
        return (await this.api.patch(`/recipient/${recipient_id}/unread`)).data;
    }

    async getNewCount(recipient_id) {
        return (await this.api.get(`/recipient/${recipient_id}`)).data.newCount;
    }

}

export default new NotificationService();
