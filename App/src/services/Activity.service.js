import createApiClient from "./api.service";

class ActivityService {
    constructor(baseUrl = "/api/logs") {
        this.api = createApiClient(baseUrl);
    }

    async createActivity(data) {
        return (await this.api.post("/", data)).data;
    }

    async getActivityById(id) {
        return (await this.api.get(`/${id}`)).data;
    }

    async updateActivity(id, data) {
        return (await this.api.put(`/${id}`, data)).data;
    }

    async deleteActivity(id) {
        return (await this.api.delete(`/${id}`)).data;
    }

    async getAllActivity(filter = {}) {
        return (await this.api.get("/", { params: filter })).data;
    }

    async getActivitiesByTaskId(taskId) {
        return (await this.api.get(`/task/${taskId}`)).data;
    }
}

export default new ActivityService();
