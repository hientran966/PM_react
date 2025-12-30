import createApiClient from "./api.service";

class FileService {
    constructor(baseUrl = "/api/file") {
        this.api = createApiClient(baseUrl);
    }

    async uploadFile(formData) {
        return (
            await this.api.post("/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            })
        ).data;
    }

    async uploadAvatar(userId, formData) {
        return (
            await this.api.post(`/avatar/${userId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            })
        ).data;
    }

    async uploadVersion(fileId, formData) {
        return (
            await this.api.post(`/${fileId}/version`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            })
        ).data;
    }

    async getAvatar(userId) {
        return (await this.api.get(`/avatar/${userId}`)).data;
    }

    async getAllFiles(filters = {}) {
        return (await this.api.get("/", { params: filters })).data;
    }

    async getFileById(id) {
        return (await this.api.get(`/${id}`)).data;
    }

    async getFileVersion(id) {
        return (await this.api.get(`/${id}/version`)).data;
    }

    async updateFile(id, data) {
        return (await this.api.put(`/${id}`, data)).data;
    }

    async deleteFile(id) {
        return (await this.api.delete(`/${id}`)).data;
    }

    async getRole(id, user_id) {
        return (await this.api.get(`/${id}/role/${user_id}`)).data;
    }
}

export default new FileService();