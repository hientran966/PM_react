import createApiClient from "./api.service";

class GithubService {
  constructor(baseUrl = "/api/github") {
    this.api = createApiClient(baseUrl);
  }

  connectApp(projectId) {
    const installUrl = `https://github.com/apps/pmb2111798/installations/new?state=${projectId}`;
    window.open(installUrl, "_blank");
  }

  async linkInstallation(projectId, installationId) {
    return (
      await this.api.post(`/project/${projectId}/link/${installationId}`)
    ).data;
  }

  async getInstallationByProject(projectId) {
    return (await this.api.get(`/project/${projectId}/installation`)).data;
  }

  async listReposByInstallation(installationId) {
    return (await this.api.get(`/installations/${installationId}/repos`)).data;
  }

  async saveProjectRepos(projectId, repos) {
    return (await this.api.post(`/project/${projectId}/repos`, { repos })).data;
  }

  async getProjectRepos(projectId) {
    return (await this.api.get(`/project/${projectId}/repos`)).data;
  }

  async unlinkInstallation(projectId) {
    return (await this.api.delete(`/project/${projectId}/unlink`)).data;
  }

  async listRepoFiles(installationId, owner, repo, path = "") {
    return (
      await this.api.get(
        `/installations/${installationId}/repos/${owner}/${repo}/tree/${path}`
      )
    ).data;
  }

  async listRecentCommits(installationId, owner, repo) {
    return (
      await this.api.get(
        `/installations/${installationId}/repos/${owner}/${repo}/commits`
      )
    ).data;
  }

  async listBranches(installationId, owner, repo) {
    return (
      await this.api.get(
        `/installations/${installationId}/repos/${owner}/${repo}/branches`
      )
    ).data;
  }

  async listPullRequests(installationId, owner, repo, state = "all") {
    return (
      await this.api.get(
        `/installations/${installationId}/repos/${owner}/${repo}/pulls`,
        { params: { state } }
      )
    ).data;
  }
}

export default new GithubService();