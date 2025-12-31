import createApiClient from "./api.service";

class CommentService {
    constructor(baseUrl = "/api/comments") {
        this.api = createApiClient(baseUrl);
    }

    async createComment(data) {
        return (await this.api.post("/", data)).data;
    }

    async getCommentById(id) {
        return (await this.api.get(`/${id}`)).data;
    }

    async updateComment(id, data) {
        return (await this.api.put(`/${id}`, data)).data;
    }

    async deleteComment(id) {
        return (await this.api.delete(`/${id}`)).data;
    }

    async getAllComments(params = {}) {
    return (await this.api.get("/", { params })).data;
    }

}

export default new CommentService();
