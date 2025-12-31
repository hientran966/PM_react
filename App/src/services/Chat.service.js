import createApiClient from "./api.service";

class ChatService {
    constructor(baseUrl = "/api/chat") {
        this.api = createApiClient(baseUrl);
    }

    // --- Channel ---
    async createChannel(data) {
        return (await this.api.post("/", data)).data;
    }

    async getAllChannels() {
        return (await this.api.get("/")).data;
    }

    async getChannelById(id) {
        return (await this.api.get(`/${id}`)).data;
    }

    async getChannelsByProject(projectId) {
        return (await this.api.get(`/project/${projectId}`)).data;
    }

    async getChannelsByUser(projectId, userId) {
        return (await this.api.get(`/project/${projectId}/user/${userId}`)).data;
    }

    async updateChannel(id, data) {
        return (await this.api.put(`/${id}`, data)).data;
    }

    async deleteChannel(id) {
        return (await this.api.delete(`/${id}`)).data;
    }

    async restoreChannel(id) {
        return (await this.api.patch(`/restore/${id}`)).data;
    }

    // --- Members ---
    async getChannelMembers(channelId) {
        return (await this.api.get(`/${channelId}/members`)).data;
    }

    async addMember(data) {
        return (await this.api.post("/member", data)).data;
    }

    async removeMember(data) {
        return (await this.api.delete("/member", { data })).data;
    }

    // --- Messages ---
    async sendMessage(data) {
        return (await this.api.post("/message", data)).data;
    }

    async getChannelMessages(channelId) {
        return (await this.api.get(`/${channelId}/messages`)).data;
    }

    async getMessageChannel(messageId) {
        return (await this.api.get(`/message/${messageId}/channel`)).data;
    }

    async sendMessageWithFiles({ channel_id, sender_id, content, files = [], parent_id, project_id, task_id }) {
        const formData = new FormData();

        formData.append("channel_id", channel_id);
        formData.append("sender_id", sender_id);
        if (content) formData.append("content", content);
        if (parent_id) formData.append("parent_id", parent_id);
        if (project_id) formData.append("project_id", project_id);
        if (task_id) formData.append("task_id", task_id);

        files.forEach(file => {
            formData.append("files", file);
        });

        return (
            await this.api.post("/message/files", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            })
        ).data;
    }

    // --- Mentions ---
    async addMentions(data) {
        return (await this.api.post("/mentions", data)).data;
    }
}

export default new ChatService();