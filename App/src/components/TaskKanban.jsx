import { useEffect, useMemo, useState } from "react";
import { Card, Tag, Progress, Button, Modal, message } from "antd";
import { CloseOutlined } from "@ant-design/icons";

import AvatarGroup from "./AvatarGroup";

import FileService from "@/services/File.service";
import TaskService from "@/services/Task.service"
import ActivityService from "@/services/Activity.service"

import { getSocket } from "@/plugins/socket";

import "@/assets/css/TaskKanban.css";

export default function KanbanBoard({ projectId, tasks = [], onOpenDetail }) {
    const [activities, setActivities] = useState({})
  const [avatarsMap, setAvatarsMap] = useState({});
  const [canChangeStatusMap, setCanChangeStatusMap] = useState({});
  const [canDeleteMap, setCanDeleteMap] = useState({});

  const [dragging, setDragging] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);

  /* =======================
     CONSTANT MAP
  ======================= */
  const reverseStatusMap = {
    "Đang Chờ": "todo",
    "Đang Tiến Hành": "in_progress",
    "Chờ Duyệt": "review",
    "Đã Xong": "done",
  };

  const priorityLabel = (val) =>
    val === "low" ? "Thấp" : val === "medium" ? "Trung Bình" : "Cao";

  /* =======================
     COMPUTED COLUMNS
  ======================= */
  const columns = useMemo(
    () => [
      { name: "Đang Chờ", tasks: tasks.filter((t) => t.status === "todo") },
      {
        name: "Đang Tiến Hành",
        tasks: tasks.filter((t) => t.status === "in_progress"),
      },
      { name: "Chờ Duyệt", tasks: tasks.filter((t) => t.status === "review") },
      { name: "Đã Xong", tasks: tasks.filter((t) => t.status === "done") },
    ],
    [tasks]
  );

  /* =======================
     HELPERS
  ======================= */
  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("vi-VN")
      : "-";

  const headerClass = (name) =>
    ({
      "Đang Chờ": "header-warning",
      "Đang Tiến Hành": "header-primary",
      "Chờ Duyệt": "header-info",
      "Đã Xong": "header-success",
    }[name]);

  const columnClass = (name) =>
    ({
      "Đang Chờ": "column-warning",
      "Đang Tiến Hành": "column-primary",
      "Chờ Duyệt": "column-info",
      "Đã Xong": "column-success",
    }[name]);

  /* =======================
     DRAG & DROP
  ======================= */
  const onDragStart = (task) => {
    if (!canChangeStatusMap[task.id]) return;
    setDragging(true);
    setDraggedTask(task);
  };

  const onDrop = async (columnName) => {
    if (!draggedTask) return;

    const newStatus = reverseStatusMap[columnName];

    if (draggedTask.status !== newStatus) {
      await taskStore.updateStatus(projectId, {
        ...draggedTask,
        status: newStatus,
      });
    }

    await activityStore.loadActivity(draggedTask.id);

    setDraggedTask(null);
    setDragging(false);
  };

  /* =======================
     LOAD AVATARS
  ======================= */
  const loadAvatars = async () => {
    const userIds = [...new Set(tasks.flatMap((t) => t.assignees || []))];
    const result = {};

    await Promise.all(
      userIds.map(async (id) => {
        try {
          const res = await FileService.getAvatar(id);
          result[id] = res?.file_url;
        } catch {
          result[id] = null;
        }
      })
    );

    setAvatarsMap(result);
  };

  /* =======================
     DELETE
  ======================= */
  const confirmDelete = (task) => {
    Modal.confirm({
      title: "Xác nhận",
      content: `Bạn có chắc muốn xóa task "${task.title}"?`,
      okText: "Xóa",
      cancelText: "Hủy",
      onOk: async () => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const userId = user?.id;
        await TaskService.deleteTask(task.id, userId)
        message.success("Đã xóa task");
      },
    });
  };

  /* =======================
     SOCKET
  ======================= */
  useEffect(() => {
    if (!projectId) return;

    const socket = getSocket();
    if (!socket) return;

    const reload = async () => {
      await taskStore.loadTasks(projectId);
    };

    socket.on("git_push", reload);
    socket.on("git_commit", reload);
    socket.on("git_event", reload);
    socket.on("activity", reload);

    return () => {
      socket.off("git_push", reload);
      socket.off("git_commit", reload);
      socket.off("git_event", reload);
      socket.off("activity", reload);
    };
  }, [projectId]);

  /* =======================
     WATCH TASKS
  ======================= */
  useEffect(() => {
    if (!tasks.length) return;
    checkRoles();
    loadAvatars();
  }, [tasks]);

  /* =======================
     RENDER
  ======================= */
  return (
    <div className="kanban-container">
      {columns.map((column) => (
        <div
          key={column.name}
          className={`kanban-column ${columnClass(column.name)}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDrop(column.name)}
        >
          <div className={`kanban-header ${headerClass(column.name)}`}>
            <strong>{column.name}</strong>
            <Tag>{column.tasks.length}</Tag>
          </div>

          <div className="kanban-list">
            {column.tasks.map((task) => (
              <Card
                key={task.id}
                className="kanban-task"
                draggable={canChangeStatusMap[task.id]}
                onDragStart={() => onDragStart(task)}
                onClick={() => !dragging && onOpenDetail?.(task)}
              >
                <div className="kanban-task-header">
                  <strong>{task.title}</strong>
                  <Tag>{priorityLabel(task.priority)}</Tag>
                </div>

                <p>{task.description}</p>
                <p>
                  <strong>Đến hạn:</strong> {formatDate(task.due_date)}
                </p>

                {task.latest_progress && (
                  <Progress percent={task.latest_progress} size="small" />
                )}

                <AvatarGroup
                  userIds={task.assignees || []}
                  max={3}
                  size={28}
                />

                {canDeleteMap[task.id] && (
                  <Button
                    icon={<CloseOutlined />}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(task);
                    }}
                  />
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}