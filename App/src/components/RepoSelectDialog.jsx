import { useEffect, useRef, useState } from "react";
import { Modal, Table, Button, Tag, Empty, message } from "antd";
import GithubService from "@/services/GitHub.service";

export default function RepoSelectDialog({
  open,
  onClose,
  projectId,
  installationId,
  currentProjectRepos = [],
  onSave,
}) {
  const [repos, setRepos] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const tableRef = useRef(null);

  /* ================= LOAD REPOS WHEN OPEN ================= */

  useEffect(() => {
    if (!open || !installationId) return;

    const loadRepos = async () => {
      try {
        const res = await GithubService.listReposByInstallation(
          installationId
        );
        setRepos(res);

        // auto select existing repos
        const keys = res
          .filter((r) =>
            currentProjectRepos.some(
              (p) => p.full_name === r.full_name
            )
          )
          .map((r) => r.id);

        setSelectedRowKeys(keys);
      } catch {
        message.error("Không tải được repository");
      }
    };

    loadRepos();
  }, [open, installationId]);

  /* ================= TABLE ================= */

  const columns = [
    {
      title: "Repository",
      dataIndex: "full_name",
    },
    {
      title: "Private",
      width: 120,
      render: (_, row) => (
        <Tag color={row.private ? "red" : "green"}>
          {row.private ? "Private" : "Public"}
        </Tag>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys, rows) => {
      setSelectedRowKeys(keys);
      setSelectedRows(rows);
    },
  };

  /* ================= ACTIONS ================= */

  const connectGitHub = () => {
    GithubService.connectApp(projectId);
  };

  const handleSave = () => {
    onSave(selectedRows);
    onClose();
  };

  /* ================= RENDER ================= */

  return (
    <Modal
      open={open}
      title="Danh sách Repository"
      width="70%"
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        <Button
          key="save"
          type="primary"
          disabled={!selectedRows.length}
          onClick={handleSave}
        >
          Lưu
        </Button>,
      ]}
    >
      <Button
        size="small"
        type="primary"
        ghost
        onClick={connectGitHub}
        style={{ marginBottom: 8 }}
      >
        Mở trang cài đặt GitHub App
      </Button>

      {repos.length ? (
        <Table
          ref={tableRef}
          rowKey="id"
          dataSource={repos}
          columns={columns}
          rowSelection={rowSelection}
          bordered
          scroll={{ y: 400 }}
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Không có repository nào"
        />
      )}
    </Modal>
  );
}