import createApiClient from "./api.service";

class ProjectService {
    constructor(baseUrl = "/api/projects") {
        this.api = createApiClient(baseUrl);
    }

    async createProject(data) {
        return (await this.api.post("/", data)).data;
    }

    async getProjectById(id) {
        return (await this.api.get(`/${id}`)).data;
    }

    async updateProject(id, data) {
        return (await this.api.put(`/${id}`, data)).data;
    }

    async deleteProject(projectId, actorId) {
        return (await this.api.delete(`/${projectId}/${actorId}`)).data;
    }

    async getAllProjects() {
        return (await this.api.get("/")).data;
    }
    
    async getProjectsByAccountId(accountId) {
        return (await this.api.get(`/account/${accountId}`)).data;
    }

    async getReportData(id) {
        return (await this.api.get(`/${id}/report`)).data;
    }

    async getRole(id, user_id) {
        return (await this.api.get(`/${id}/role/${user_id}`)).data;
    }
}

export default new ProjectService();