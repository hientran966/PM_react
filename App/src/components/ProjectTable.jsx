import { useEffect, useMemo, useState } from "react";
import { Table, Tag } from "antd";
import { useNavigate } from "react-router-dom";

import ProjectService from "@/services/Project.service";
import MemberService from "@/services/Member.service";
import AvatarGroup from "@/components/AvatarGroup";

const PAGE_SIZE = 7;

function ProjectTable({ projects }) {
  const navigate = useNavigate();

  const [projectMembers, setProjectMembers] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    if (!projects.length) return;

    async function loadMembers() {
      const membersMap = {};

      await Promise.all(
        projects.map(async (p) => {
          try {
            const members = await MemberService.getByProjectId(p.id);
            membersMap[p.id] = Array.isArray(members)
              ? members.map((m) => m.user_id)
              : [];
          } catch {
            membersMap[p.id] = [];
          }
        })
      );

      setProjectMembers(membersMap);
    }

    loadMembers();
  }, [projects]);

  /* ================= DATA SOURCE ================= */
  const dataSource = useMemo(
    () =>
      projects.map((p) => ({
        key: p.id,
        ...p,
      })),
    [projects]
  );

  /* ================= COLUMNS ================= */
  const columns = [
    {
      title: "Tên dự án",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
    {
      title: "Ngày bắt đầu",
      dataIndex: "start_date",
      key: "start_date",
      render: (v) => (v ? new Date(v).toLocaleDateString("vi-VN") : ""),
    },
    {
      title: "Ngày kết thúc",
      dataIndex: "end_date",
      key: "end_date",
      render: (v) => (v ? new Date(v).toLocaleDateString("vi-VN") : ""),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "Đang tiến hành" ? "blue" : "green"}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Thành viên",
      key: "members",
      width: 180,
      render: (_, record) => (
        <AvatarGroup
          userIds={projectMembers[record.id] || []}
          projectId={record.id}
          max={3}
          size={28}
        />
      ),
    },
  ];

  /* ================= RENDER ================= */
  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      pagination={{
        current: currentPage,
        pageSize: PAGE_SIZE,
        total: dataSource.length,
        onChange: setCurrentPage,
        showSizeChanger: false,
      }}
      onRow={(record) => ({
        onClick: () => navigate(`/projects/${record.id}`),
      })}
      rowClassName="project-row"
    />
  );
}

export default ProjectTable;