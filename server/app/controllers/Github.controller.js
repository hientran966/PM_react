const GitHubService = require("../services/Github.service");

class GitHubController {
  /* ================= CALLBACK ================= */

  async callback(req, res) {
    try {
      const { installation_id, state } = req.query;
      const projectId = state;

      if (!installation_id) {
        return res.status(400).json({ message: "Missing installation_id" });
      }

      await GitHubService.saveInstallation(installation_id, "unknown_user");

      if (projectId) {
        const result = await GitHubService.linkInstallationToProject(
          projectId,
          installation_id
        );

        if (result instanceof Error) {
          return res.status(400).json({ message: result.message });
        }
      }

      const frontendUrl =
        process.env.FRONTEND_URL || "http://localhost:3001";

      res.redirect(
        `${frontendUrl}/git?connected=true&project=${projectId}`
      );
    } catch (err) {
      console.error("GitHub callback error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /* ================= LINK ================= */

  async linkInstallation(req, res) {
    try {
      const { projectId, installationId } = req.params;

      const result =
        await GitHubService.linkInstallationToProject(
          projectId,
          installationId
        );

      if (result instanceof Error) {
        return res.status(400).json({ message: result.message });
      }

      res.json({ message: "Linked successfully" });
    } catch (err) {
      console.error("Link installation error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /* ================= GET INSTALLATION ================= */

  async getInstallation(req, res) {
    try {
      const { projectId } = req.params;

      const installation =
        await GitHubService.getInstallationByProject(projectId);

      if (!installation) {
        return res.status(404).json({ message: "Chưa cài đặt GitHub cho dự án này" });
      }

      res.json(installation);
    } catch (err) {
      console.error("Get installation error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /* ================= REPOSITORIES ================= */

  async listRepos(req, res) {
    try {
      const { installationId } = req.params;
      const repos = await GitHubService.listRepositories(installationId);
      res.json(repos);
    } catch (err) {
      console.error("List repos error:", err);
      res.status(500).json({ message: "Cannot fetch repositories" });
    }
  }

  async saveProjectRepos(req, res) {
    try {
      const { projectId } = req.params;
      const { repos } = req.body;

      await GitHubService.saveProjectRepositories(projectId, repos);

      res.json({ message: "Saved project repositories" });
    } catch (err) {
      console.error("Save project repos error:", err);
      res.status(500).json({ message: "Failed to save repositories" });
    }
  }

  async getProjectRepos(req, res) {
    try {
      const { projectId } = req.params;
      const repos = await GitHubService.getProjectRepositories(projectId);
      res.json(repos);
    } catch (err) {
      console.error("Get project repos error:", err);
      res.status(500).json({ message: "Failed to get repositories" });
    }
  }

  /* ================= UNLINK ================= */

  async unlinkInstallation(req, res) {
    try {
      const { projectId } = req.params;

      const result =
        await GitHubService.unlinkInstallationFromProject(projectId);

      if (result instanceof Error) {
        return res.status(400).json({ message: result.message });
      }

      res.json({ message: "Installation unlinked successfully" });
    } catch (err) {
      console.error("Unlink installation error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  /* ================= CONTENT ================= */

  async listRepoFiles(req, res) {
    try {
      const { installationId, owner, repo } = req.params;
      const path = req.params[0] || "";

      const files = await GitHubService.listRepoFiles(
        installationId,
        owner,
        repo,
        path
      );

      res.json(files);
    } catch (err) {
      console.error("List repo files error:", err);
      res.status(500).json({ message: "Cannot fetch repo files" });
    }
  }

  async listRecentCommits(req, res) {
    try {
      const { installationId, owner, repo } = req.params;
      const commits =
        await GitHubService.listRecentCommits(
          installationId,
          owner,
          repo
        );

      res.json(commits);
    } catch (err) {
      console.error("List commits error:", err);
      res.status(500).json({ message: "Cannot fetch commits" });
    }
  }

  async listBranches(req, res) {
    try {
      const { installationId, owner, repo } = req.params;
      const branches =
        await GitHubService.listBranches(
          installationId,
          owner,
          repo
        );

      res.json(branches);
    } catch (err) {
      console.error("List branches error:", err);
      res.status(500).json({ message: "Cannot fetch branches" });
    }
  }

  async listPullRequests(req, res) {
    try {
      const { installationId, owner, repo } = req.params;
      const state = req.query.state || "all";

      const pulls =
        await GitHubService.listPullRequests(
          installationId,
          owner,
          repo,
          state
        );

      res.json(pulls);
    } catch (err) {
      console.error("List pull requests error:", err);
      res.status(500).json({ message: "Cannot fetch pull requests" });
    }
  }
}

module.exports = new GitHubController();