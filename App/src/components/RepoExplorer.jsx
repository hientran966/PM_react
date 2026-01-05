import { useEffect, useState } from "react";
import { Tabs, Table, Select, Button, Tag, message } from "antd";
import {
  FolderOutlined,
  FileOutlined,
  GithubOutlined,
} from "@ant-design/icons";

import { getSocket } from "@/plugins/socket";
import GithubService from "@/services/GitHub.service";

const { TabPane } = Tabs;

export default function RepoExplorer({ repo, installationId }) {
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState("");
  const [files, setFiles] = useState([]);
  const [commits, setCommits] = useState([]);
  const [pulls, setPulls] = useState([]);
  const [activeTab, setActiveTab] = useState("files");

  const [loading, setLoading] = useState({
    files: false,
    commits: false,
    pulls: false,
  });

  const [owner, repoName] = repo.full_name.split("/");

  /* ================= LOADERS ================= */

  const loadBranches = async () => {
    try {
      const res = await GithubService.listBranches(
        installationId,
        owner,
        repoName
      );
      setBranches(res);
      if (res.length) {
        setCurrentBranch(res[0].name);
        loadFiles();
      }
    } catch {
      message.error("Không tải được danh sách branch");
    }
  };

  const loadFiles = async () => {
    try {
      setLoading((l) => ({ ...l, files: true }));
      const res = await GithubService.listRepoFiles(
        installationId,
        owner,
        repoName,
        currentBranch
      );
      setFiles(res);
    } catch {
      message.error("Không tải được danh sách file");
    } finally {
      setLoading((l) => ({ ...l, files: false }));
    }
  };

  const loadCommits = async () => {
    try {
      setLoading((l) => ({ ...l, commits: true }));
      const res = await GithubService.listRecentCommits(
        installationId,
        owner,
        repoName
      );
      setCommits(res);
    } catch {
      message.error("Không tải được commits");
    } finally {
      setLoading((l) => ({ ...l, commits: false }));
    }
  };

  const loadPulls = async () => {
    try {
      setLoading((l) => ({ ...l, pulls: true }));
      const res = await GithubService.listPullRequests(
        installationId,
        owner,
        repoName,
        "all"
      );
      setPulls(res);
    } catch {
      message.error("Không tải được Pull Requests");
    } finally {
      setLoading((l) => ({ ...l, pulls: false }));
    }
  };

  /* ================= EVENTS ================= */

  const timeAgo = (iso) => {
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
    return new Date(iso).toLocaleDateString("vi-VN");
  };

  /* ================= SOCKET ================= */

  useEffect(() => {
    loadBranches();

    const socket = getSocket();
    if (!socket) return;

    socket.on("git_push", () => {
      if (activeTab === "commits") loadCommits();
    });

    socket.on("git_commit", () => {
      if (activeTab === "commits") loadCommits();
    });

    socket.on("git_event", (event) => {
      if (event.type === "pull_request" && activeTab === "pulls") {
        loadPulls();
      }
    });

    return () => socket.off();
  }, [activeTab]);

  /* ================= COLUMNS ================= */

  const fileColumns = [
    {
      title: "Tên",
      dataIndex: "name",
      render: (_, row) => (
        <>
          {row.type === "dir" ? <FolderOutlined /> : <FileOutlined />}{" "}
          {row.name}
        </>
      ),
    },
    {
      title: "Loại",
      dataIndex: "type",
      width: 120,
    },
  ];

  const commitColumns = [
    {
      title: "Commit",
      render: (_, r) => (
        <a href={r.html_url} target="_blank">
          {r.sha.slice(0, 7)}
        </a>
      ),
    },
    { title: "Message", dataIndex: ["commit", "message"] },
    {
      title: "Tác giả",
      render: (_, r) => r.commit.author.name,
    },
    {
      title: "Thời gian",
      render: (_, r) => timeAgo(r.commit.author.date),
    },
  ];

  const pullColumns = [
    {
      title: "Tiêu đề",
      render: (_, r) => (
        <a href={r.html_url} target="_blank">
          #{r.number} - {r.title}
        </a>
      ),
    },
    {
      title: "Người tạo",
      render: (_, r) => r.user,
      width: 150,
    },
    {
      title: "Trạng thái",
      width: 120,
      render: (_, r) => (
        <Tag
          color={
            r.state === "open"
              ? "green"
              : r.merged_at
              ? "blue"
              : "red"
          }
        >
          {r.merged_at ? "Merged" : r.state}
        </Tag>
      ),
    },
    {
      title: "Cập nhật",
      render: (_, r) => timeAgo(r.updated_at),
      width: 160,
    },
  ];

  /* ================= RENDER ================= */

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <b>{repo.full_name}</b>

        <div>
          <Select
            style={{ width: 200, marginRight: 8 }}
            value={currentBranch}
            onChange={setCurrentBranch}
            options={branches.map((b) => ({
              label: b.name,
              value: b.name,
            }))}
          />

          <Button
            icon={<GithubOutlined />}
            onClick={() => window.open(repo.html_url)}
          >
            GitHub
          </Button>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          if (key === "commits" && !commits.length) loadCommits();
          if (key === "pulls" && !pulls.length) loadPulls();
        }}
      >
        <TabPane tab="Files" key="files">
          <Table
            rowKey="path"
            loading={loading.files}
            columns={fileColumns}
            dataSource={files}
            onRow={(r) => ({
              onClick: () =>
                r.type === "file" && window.open(r.html_url),
            })}
          />
        </TabPane>

        <TabPane tab="Commits" key="commits">
          <Table
            rowKey="sha"
            loading={loading.commits}
            columns={commitColumns}
            dataSource={commits}
          />
        </TabPane>

        <TabPane tab="Pull Requests" key="pulls">
          <Table
            rowKey="id"
            loading={loading.pulls}
            columns={pullColumns}
            dataSource={pulls}
          />
        </TabPane>
      </Tabs>
    </div>
  );
}