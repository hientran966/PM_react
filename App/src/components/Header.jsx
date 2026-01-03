import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import {
  Button,
  Input,
  Divider,
  Drawer,
  Select,
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

import {
  setSearch as setProjectSearch,
} from "@/stores/projectSlice";

import {
  setSearch as setTaskSearch,
  setPriorityFilter,
  setAssigneeFilter,
} from "@/stores/taskSlice";

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
  const dispatch = useDispatch();

  /* =====================
     STATE
  ===================== */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({
    priority: null,
    assignees: null,
  });

  /* =====================
     TITLE
  ===================== */
  const projectName = useMemo(
    () => project?.name || "",
    [project]
  );

  const channelName = useMemo(
    () => channel?.name || "",
    [channel]
  );

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
     DROPDOWN MENU
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
              onChange={(e) => {
                const value = e.target.value;
                if (page === "project") dispatch(setProjectSearch(value));
                if (view === "kanban") dispatch(setTaskSearch(value));
              }}
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
      >
        <div style={{ marginBottom: 12 }}>
          <label>Ưu tiên</label>
          <Select
            value={filters.priority}
            onChange={(v) =>
              setFilters((prev) => ({ ...prev, priority: v }))
            }
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
            onChange={(v) =>
              setFilters((prev) => ({ ...prev, assignees: v }))
            }
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
          <Button
            onClick={() => {
              setFilters({ priority: null, assignees: null });
              dispatch(setPriorityFilter(null));
              dispatch(setAssigneeFilter(null));
            }}
          >
            Đặt lại
          </Button>

          <Button
            type="primary"
            style={{ marginLeft: 8 }}
            onClick={() => {
              dispatch(setPriorityFilter(filters.priority));
              dispatch(setAssigneeFilter(filters.assignees));
              setDrawerOpen(false);
            }}
          >
            Áp dụng
          </Button>
        </div>
      </Drawer>
    </div>
  );
}