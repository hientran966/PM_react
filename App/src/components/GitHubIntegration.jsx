import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Button,
  Table,
  Empty,
  Modal,
  Input,
  message,
} from "antd";

import GitHubService from "@/services/GitHub.service";
import { getSocket } from "@/plugins/socket";

import RepoExplorer from "@/components/RepoExplorer";
import RepoSelectDialog from "@/components/RepoSelectDialog";

import "@/assets/css/GitHubIntegration.css";

export default function GitHubIntegration() {
  const { id: projectId } = useParams();

  const [installation, setInstallation] = useState(null);
  const [projectRepos, setProjectRepos] = useState([]);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [manualInstallId, setManualInstallId] = useState("");

  const [activeRepo, setActiveRepo] = useState(null);
  const [explorerVisible, setExplorerVisible] = useState(false);

  const [repoDialogVisible, setRepoDialogVisible] = useState(false);

  /* =====================
     PERMISSION
  ===================== */

  /* =====================
     UTILS
  ===================== */
  const timeAgo = (iso) => {
    if (!iso) return "–";
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
    return new Date(iso).toLocaleDateString("vi-VN");
  };

  /* =====================
     ACTIONS
  ===================== */
  const connectGitHub = () => GitHubService.connectApp(projectId);

  const saveManualInstall = async () => {
    if (!manualInstallId) {
      return message.warning("Vui lòng nhập Installation ID!");
    }

    await GitHubService.linkInstallation(projectId, manualInstallId);
    message.success("Đã liên kết installation thành công!");
    setDialogVisible(false);
    fetchInstallation();
  };

  const unlinkInstall = async () => {
    Modal.confirm({
      title: "Xác nhận hủy kết nối",
      content: (
        <div>
          Bạn có chắc chắn muốn hủy kết nối GitHub App?
          <br />
          <b>Tất cả repository sẽ bị ngắt kết nối.</b>
        </div>
      ),
      okText: "Xác nhận",
      cancelText: "Hủy",
      okType: "danger",
      async onOk() {
        await GitHubService.unlinkInstallation(projectId);
        setInstallation(null);
        setProjectRepos([]);
        message.success("Đã hủy kết nối GitHub App!");
      },
    });
  };

  /* =====================
     FETCH
  ===================== */
  const fetchInstallation = async () => {
    try {
      const res = await GitHubService.getInstallationByProject(projectId);
      setInstallation(res);
      if (res) fetchProjectRepos();
    } catch {
      setInstallation(null);
    }
  };

  const fetchProjectRepos = async () => {
    try {
      const repos = await GitHubService.getProjectRepos(projectId);

      if (installation?.installation_id) {
        await Promise.all(
          repos.map(async (repo) => {
            try {
              const [owner, name] = repo.full_name.split("/");
              const commits = await GitHubService.listRecentCommits(
                installation.installation_id,
                owner,
                name
              );

              if (commits.length) {
                repo.lastCommitDate =
                  commits[0].commit.author.date;
              }
            } catch {
              repo.lastCommitDate = null;
            }
          })
        );
      }

      setProjectRepos([...repos]);
    } catch {
      message.error("Không tải được danh sách repository");
    }
  };

  const saveSelectedRepos = async (repos) => {
    await GitHubService.saveProjectRepos(projectId, repos);
    message.success("Đã lưu danh sách repo!");
    fetchProjectRepos();
  };

  /* =====================
     EFFECT
  ===================== */
  useEffect(() => {
    (async () => {
      fetchInstallation();
    })();

    const socket = getSocket();
    if (!socket) return;

    socket.on("git_push", fetchProjectRepos);
    socket.on("git_commit", fetchProjectRepos);

    return () => {
      socket.off("git_push", fetchProjectRepos);
      socket.off("git_commit", fetchProjectRepos);
    };
  }, [projectId]);

  /* =====================
     TABLE
  ===================== */
  const columns = [
    { title: "Repository", dataIndex: "full_name" },
    {
      title: "URL",
      width: 280,
      render: (_, row) => (
        <a href={row.html_url} target="_blank" rel="noreferrer">
          Truy cập GitHub
        </a>
      ),
    },
    {
      title: "Hoạt động",
      width: 160,
      render: (_, row) => timeAgo(row.lastCommitDate),
    },
  ];

  /* =====================
     RENDER
  ===================== */
  return (
    <div className="github-integration">
        <div className="section-box">
          {!installation ? (
            <div className="not-connected">
              <p>Chưa kết nối GitHub App với dự án này.</p>
              <Button type="primary" onClick={connectGitHub}>
                Mở trang cài đặt GitHub App
              </Button>
              <Button
                type="default"
                onClick={() => setDialogVisible(true)}
              >
                Nhập Installation ID
              </Button>
            </div>
          ) : (
            <>
              <Button
                size="small"
                onClick={() => setRepoDialogVisible(true)}
              >
                Mở danh sách repository
              </Button>
              <Button
                danger
                size="small"
                onClick={unlinkInstall}
                style={{ marginLeft: 8 }}
              >
                Hủy kết nối
              </Button>

              {projectRepos.length ? (
                <Table
                  columns={columns}
                  dataSource={projectRepos}
                  rowKey="id"
                  pagination={false}
                  onRow={(row) => ({
                    onClick: () => {
                      setActiveRepo(row);
                      setExplorerVisible(true);
                    },
                  })}
                />
              ) : (
                <Empty description="Chưa có repository" />
              )}
            </>
          )}
        </div>

      {/* Manual install */}
      <Modal
        title="Nhập Installation ID"
        open={dialogVisible}
        onCancel={() => setDialogVisible(false)}
        onOk={saveManualInstall}
      >
        <Input
          value={manualInstallId}
          onChange={(e) => setManualInstallId(e.target.value)}
          placeholder="Installation ID"
        />
      </Modal>

      {/* Explorer */}
      <Modal
        open={explorerVisible}
        footer={null}
        width="80%"
        onCancel={() => setExplorerVisible(false)}
        destroyOnClose
      >
        {activeRepo && installation && (
          <RepoExplorer
            repo={activeRepo}
            installationId={installation.installation_id}
          />
        )}
      </Modal>

      <RepoSelectDialog
        open={repoDialogVisible}
        onClose={() => setRepoDialogVisible(false)}
        installationId={installation?.installation_id}
        currentProjectRepos={projectRepos}
        projectId={projectId}
        onSave={saveSelectedRepos}
      />
    </div>
  );
}
