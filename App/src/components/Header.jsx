import { useMemo, useState } from "react";
import {
  Button,
  Input,
  Divider,
  Drawer,
  Select,
  Tooltip,
  Dropdown,
  Modal,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  MoreOutlined,
  DeleteOutlined,
  EditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";

import AvatarGroup from "@/components/AvatarGroup";

//import { useProjectStore } from "@/stores/projectStore";
//import { useTaskStore } from "@/stores/taskStore";
//import { useChatStore } from "@/stores/chatStore";
//import { useRoleStore } from "@/stores/roleStore";

import "@/assets/css/Header.css";

const { Option } = Select;

export default function Header({
  page,
  view,
  project,
  channel,
  members = [],
  isExpanded,
  onAdd,
  onEditProject,
  onDeleteProject,
  onEditChannel,
  onDeleteChannel,
  onMemberClick,
  onToggleMenu,
}) {
  /* =====================
     STORE
  ===================== */
  //const projectStore = useProjectStore();
  //const taskStore = useTaskStore();
  //const chatStore = useChatStore();
  //const roleStore = useRoleStore();

  /* =====================
     STATE
  ===================== */
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [filters, setFilters] = useState({
    priority: "",
    assignees: null,
  });

  /* =====================
     TITLE
  ===================== */
  const projectName = useMemo(() => {
    if (!project) return "";
    return project.name || "";
  }, [project]);

  const channelName = useMemo(() => {
    if (!channel) return "";
    return channel.name || "";
  }, [channel]);

  const pageTitle = useMemo(() => {
    if (view === "chat" && channelName) return channelName;
    if (page === "task" && projectName) return projectName;
    return page === "project" ? "Danh sách Project" : "Danh sách";
  }, [page, view, projectName, channelName]);

  /* =====================
     MEMBERS
  ===================== */
  const memberIds = useMemo(
    () => members.map((m) => m.user_id),
    [members]
  );

  const namesMap = useMemo(
    () =>
      Object.fromEntries(
        members.map((m) => [m.user_id, m.name || "Người dùng"])
      ),
    [members]
  );

  /* =====================
     ROLE CHECK
  ===================== */

  /* =====================
     SEARCH
  ===================== */

  /* =====================
     FILTER
  ===================== */

  /* =====================
     DELETE CONFIRM
  ===================== */
  const confirmDeleteProject = () => {
    Modal.confirm({
      title: "Xác nhận",
      content: "Bạn có chắc muốn xóa dự án này?",
      okText: "Xóa",
      okType: "danger",
      onOk: () => onDeleteProject?.(project.id),
    });
  };

  const confirmDeleteChannel = () => {
    Modal.confirm({
      title: "Xác nhận",
      content: "Bạn có chắc muốn xóa kênh này?",
      okText: "Xóa",
      okType: "danger",
      onOk: () => onDeleteChannel?.(channel.id),
    });
  };

  /* =====================
     MENU
  ===================== */
  const dropdownItems =
    view === "chat"
      ? [
          {
            key: "edit-channel",
            label: "Chỉnh sửa kênh",
            icon: <EditOutlined />,
            onClick: onEditChannel,
          },
          {
            key: "delete-channel",
            label: "Xóa kênh",
            icon: <DeleteOutlined />,
            danger: true,
            onClick: confirmDeleteChannel,
          },
        ]
      : [
          {
            key: "edit-project",
            label: "Chỉnh sửa dự án",
            icon: <EditOutlined />,
            onClick: onEditProject,
          },
          {
            key: "delete-project",
            label: "Xóa dự án",
            icon: <DeleteOutlined />,
            danger: true,
            onClick: confirmDeleteProject,
          },
        ];

  /* =====================
     RENDER
  ===================== */
  return (
    <div style={{ padding: "16px 24px", background: "#fff" }}>
      {/* ===== TITLE ===== */}
      <div style={{ display: "flex", alignItems: "center", height: 40 }}>
        {page === "task" && (
          <Button
            type="text"
            icon={isExpanded ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            onClick={onToggleMenu}
          />
        )}
        <h3 style={{ margin: 0, marginLeft: 16, color: "black" }}>{pageTitle}</h3>
      </div>

      <Divider style={{ margin: "12px 0" }} />

      {/* ===== TOOLBAR ===== */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {/* LEFT */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {(view === "kanban" || page === "project") && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
              Thêm mới
            </Button>
          )}
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {(view === "kanban" || page === "project") && (
            <Input
              placeholder="Tìm kiếm..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 180, marginRight: 8 }}
              allowClear
            />
          )}

          {view === "kanban" && (
            <Button
              icon={<FilterOutlined />}
              onClick={() => setDrawerOpen(true)}
              style={{ marginRight: 8 }}
            />
          )}

          {page === "task" && memberIds.length > 0 && (
            <AvatarGroup
              userIds={memberIds}
              projectId={project.id}
              userNameMap={namesMap}
              onClick={onMemberClick}
            />
          )}

          {page === "task" && (
            <Dropdown menu={{ items: dropdownItems }} trigger={["click"]}>
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          )}
        </div>
      </div>

      {/* ===== FILTER DRAWER ===== */}
      <Drawer
        title="Bộ lọc công việc"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size={300}
      >
        <div style={{ marginBottom: 12 }}>
          <label>Ưu tiên</label>
          <Select
            value={filters.priority}
            onChange={(v) => setFilters({ ...filters, priority: v })}
            allowClear
            style={{ width: "100%" }}
          >
            <Option value="low">Thấp</Option>
            <Option value="medium">Trung bình</Option>
            <Option value="high">Cao</Option>
          </Select>
        </div>

        <div>
          <label>Người phụ trách</label>
          <Select
            value={filters.assignees}
            onChange={(v) => setFilters({ ...filters, assignees: v })}
            allowClear
            style={{ width: "100%" }}
          >
            {memberIds.map((id) => (
              <Option key={id} value={id}>
                {namesMap[id]}
              </Option>
            ))}
          </Select>
        </div>

        <div style={{ marginTop: 16, textAlign: "right" }}>
          <Button onClick={[]}>Đặt lại</Button> 
          <Button type="primary" onClick={[]} style={{ marginLeft: 8 }}>
            Áp dụng
          </Button>
        </div>
      </Drawer>
    </div>
  );
}