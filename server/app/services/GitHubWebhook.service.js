const crypto = require("crypto");
const ActivityService = require("../services/Activity.service");
const MySQL = require("../utils/mysql.util");

const {
  sendGitEventToProject,
  sendGitPushToProject,
  sendGitCommitToProject,
} = require("../socket");

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const TASK_REGEX = /#(\d+)/g;

class WebhookService {
  constructor() {
    this.activityService = new ActivityService(MySQL.pool);
  }

  verifySignature(req, buf) {
    const signature = req.headers["x-hub-signature-256"];
    if (!signature) throw new Error("No signature");

    const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
    const digest = "sha256=" + hmac.update(buf).digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
      throw new Error("Invalid signature");
    }
  }

  extractTaskCodes(text) {
    if (!text) return [];
    return text.match(TASK_REGEX) || [];
  }

  async getTaskId(projectId, code) {
    const digits = code.replace(/\D/g, "");
    if (!digits) return null;

    const rows = await MySQL.query(
      "SELECT id FROM tasks WHERE id = ? AND project_id = ? AND deleted_at IS NULL",
      [digits, projectId]
    );

    return rows.length > 0 ? rows[0].id : null;
  }

  async processGitWebhook(event, payload) {
    const repoFullName = payload.repository.full_name;

    const rows = await MySQL.query(
      "SELECT project_id FROM project_repositories WHERE full_name = ?",
      [repoFullName]
    );

    if (rows.length === 0) {
      return { message: "Repository not linked to project", projectIds: [] };
    }

    const projectIds = rows.map((r) => r.project_id);

    for (const projectId of projectIds) {
      if (event === "push") {
        await this.handlePushEvent(projectId, payload);
      } else if (event === "pull_request") {
        await this.handlePullRequestEvent(projectId, payload);
      } else if (event === "issues") {
        await sendGitEventToProject(projectId, {
          type: "issue",
          action: payload.action,
          title: payload.issue.title,
          user: payload.issue.user.login,
          url: payload.issue.html_url,
        });
      }
    }

    return { message: "OK", projectIds };
  }

  async handlePushEvent(projectId, payload) {
    const branch = payload.ref.replace("refs/heads/", "");

    const pushData = {
      repo: payload.repository.full_name,
      branch,
      pusher: payload.pusher?.name,
      commits: payload.commits,
    };

    await sendGitPushToProject(projectId, pushData);

    if (branch !== "main") return;
    const isMergeFromPR =
      payload.compare?.includes("/pull/") ||
      payload.head_commit?.message?.includes("Merge pull request") ||
      payload.commits.length > 1;

    if (isMergeFromPR) return;

    for (const commit of payload.commits || []) {
      const messages = [commit.message, commit.title, commit.body].filter(
        Boolean
      );
      const fullText = messages.join("\n");

      const taskCodes = this.extractTaskCodes(fullText);

      for (const code of taskCodes) {
        const taskId = await this.getTaskId(projectId, code);

        if (taskId) {
          await this.activityService.create({
            project_id: projectId,
            task_id: taskId,
            actor_id: 0,
            detail: `Có commit mới: ${commit.message}`,
            created_at: new Date(),
          });
        }
      }

      await sendGitCommitToProject(projectId, {
        message: commit.message,
        author: commit.author,
        url: commit.url,
      });
    }
  }

  async handlePullRequestEvent(projectId, payload) {
    const pr = payload.pull_request;
    const action = payload.action;
    console.log(action);

    const isOpened = action === "opened";
    const isMerged =
      action === "closed" &&
      pr.merged === true &&
      pr.base.ref === "main";

    if (!isOpened && !isMerged) return;

    await sendGitEventToProject(projectId, {
      type: "pull_request",
      action,
      title: pr.title,
      user: pr.user.login,
      url: pr.html_url,
    });

    const fullText = [pr.title, pr.body].filter(Boolean).join("\n");
    const taskCodes = this.extractTaskCodes(fullText);

    const detail = isOpened
      ? `Pull Request được mở: ${pr.title}`
      : `Pull Request đã merged: ${pr.title}`;

    if (taskCodes.length > 0) {
      for (const code of taskCodes) {
        const taskId = await this.getTaskId(projectId, code);

        if (taskId) {
          await this.activityService.create({
            project_id: projectId,
            task_id: taskId,
            actor_id: 0,
            detail,
            created_at: new Date(),
          });
        }
      }
    } 
  }
}

module.exports = new WebhookService();
