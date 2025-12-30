import createApiClient from "./api.service";

class MemberService {
    constructor(baseUrl = "/api/members") {
        this.api = createApiClient(baseUrl);
    }

    async createMember(data) {
        return (await this.api.post("/", data)).data;
    }

    async getMemberById(id) {
        return (await this.api.get(`/${id}`)).data;
    }

    async updateMember(id, data) {
        return (await this.api.put(`/${id}`, data)).data;
    }

    async deleteMember(id) {
        return (await this.api.delete(`/${id}`)).data;
    }

    async getAllMembers() {
        return (await this.api.get("/")).data;
    }

    async getByProjectId(projectId) {
        return (await this.api.get(`/project/${projectId}`)).data;
    }

    async getInviteList(userId) {
        return (await this.api.get(`/user/${userId}`)).data;
    }

    async checkIfMemberExists(projectId, userId) {
        return (await this.api.get(`/check/${projectId}/${userId}`)).data.exists;
    }

    async acceptInvite(id, userId) {
        return (await this.api.post(`/${id}/accept`, { user_id: userId })).data;
    }
    async declineInvite(id, userId) {
        return (await this.api.post(`/${id}/decline`, { user_id: userId })).data;
    }
}

export default new MemberService();
