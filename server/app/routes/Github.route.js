const express = require("express");
const GitHubController = require("../controllers/Github.controller");
const router = express.Router();

// callback khi cài app
router.get("/callback", GitHubController.callback);

// liên kết installation với project
router.post(
  "/project/:projectId/link/:installationId",
  GitHubController.linkInstallation 
);

// lấy installation của project
router.get(
  "/project/:projectId/installation",
  GitHubController.getInstallation
);

// liệt kê repo của installation
router.get("/installations/:installationId/repos", GitHubController.listRepos);

// lưu / lấy repo của project
router.post("/project/:projectId/repos", GitHubController.saveProjectRepos);
router.get("/project/:projectId/repos", GitHubController.getProjectRepos);

// Hủy liên kết installation
router.delete(
  "/project/:projectId/unlink",
  GitHubController.unlinkInstallation
);

// Xem file/folder trong repo
router.get(
  "/installations/:installationId/repos/:owner/:repo/tree/*?",
  GitHubController.listRepoFiles
);

// Xem commit gần đây
router.get(
  "/installations/:installationId/repos/:owner/:repo/commits",
  GitHubController.listRecentCommits
);

// Danh sách branch của repo
router.get(
  "/installations/:installationId/repos/:owner/:repo/branches",
  GitHubController.listBranches
);

// Danh sách Pull Request của repo
router.get(
  "/installations/:installationId/repos/:owner/:repo/pulls",
  GitHubController.listPullRequests
);


module.exports = router;
