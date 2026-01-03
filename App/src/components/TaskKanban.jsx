import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Tag, Button, Progress, Modal, message } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";

import AvatarGroup from "./AvatarGroup";
import { loadTasks, updateStatus, deleteTask } from "@/stores/taskSlice";
import { loadActivity } from "@/stores/activitySlice";
import { getSocket } from "@/plugins/socket";

import "@/assets/css/TaskKanban.css";

const reverseStatusMap = {
  "Đang Chờ": "todo",
  "Đang Tiến Hành": "in_progress",
  "Chờ Duyệt": "review",
  "Đã Xong": "done",
};

const priorityLabel = (val) =>
  val === "low" ? "Thấp" : val === "medium" ? "Trung Bình" : "Cao";

export default function KanbanBoard({ projectId, tasks = [], onOpenDetail }) {
  const dispatch = useDispatch();

  const [dragging, setDragging] = useState(false);
  const draggedTaskRef = useRef(null);

  /* =====================
     COMPUTED COLUMNS
  ===================== */
  const columns = useMemo(
    () => [
      { name: "Đang Chờ", tasks: tasks.filter(t => t.status === "todo") },
      {
        name: "Đang Tiến Hành",
        tasks: tasks.filter(t => t.status === "in_progress"),
      },
      { name: "Chờ Duyệt", tasks: tasks.filter(t => t.status === "review") },
      { name: "Đã Xong", tasks: tasks.filter(t => t.status === "done") },
    ],
    [tasks]
  );

  /* =====================
     DRAG & DROP
  ===================== */
  const onDragStart = (task) => {
    draggedTaskRef.current = task;
    setDragging(true);
  };

  const onDrop = async (toColumnName) => {
    const task = draggedTaskRef.current;
    if (!task) return;

    const newStatus = reverseStatusMap[toColumnName];
    if (task.status !== newStatus) {
      await dispatch(
        updateStatus({
          projectId,
          task: { ...task, status: newStatus },
        })
      );
      await dispatch(loadActivity(task.id));
    }

    draggedTaskRef.current = null;
    setDragging(false);
  };

  /* =====================
     DELETE
  ===================== */
  const confirmDelete = (task) => {
    Modal.confirm({
      title: "Xác nhận",
      content: `Bạn có chắc muốn xóa task "${task.title}" không?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        await dispatch(deleteTask(task.id));
        message.success("Đã xóa task");
      },
    });
  };

  /* =====================
     SOCKET
  ===================== */
  useEffect(() => {
    if (!projectId) return;

    dispatch(loadTasks(projectId));
    const socket = getSocket();
    if (!socket) return;

    const reload = () => dispatch(loadTasks(projectId));

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
  }, [projectId, dispatch]);

  /* =====================
     RENDER
  ===================== */
  return (
    <div className="kanban-container">
      {columns.map(column => (
        <div
          key={column.name}
          className={`kanban-column ${columnClass(column.name)}`}
          onDragOver={e => e.preventDefault()}
          onDrop={() => onDrop(column.name)}
        >
          <div className={`kanban-header ${headerClass(column.name)}`}>
            <strong>{column.name}</strong>
            <Tag>{column.tasks.length}</Tag>
          </div>

          <div className="kanban-list">
            {column.tasks.map(task => (
              <Card
                key={task.id}
                className="kanban-task"
                draggable
                onDragStart={() => onDragStart(task)}
                onClick={() => !dragging && onOpenDetail?.(task)}
                hoverable
              >
                <div className="kanban-task-header">
                  <strong
                    style={{
                      textDecoration:
                        task.status === "done" ? "line-through" : "none",
                    }}
                  >
                    {task.title}
                  </strong>

                  <Tag>
                    {priorityLabel(task.priority)}
                  </Tag>
                </div>

                <div className="task-body">
                  {task.description && <p>{task.description}</p>}
                  <p>
                    <strong>Đến hạn:</strong>{" "}
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString("vi-VN")
                      : "-"}
                  </p>

                  {task.latest_progress && (
                    <Progress percent={task.latest_progress} size="small" />
                  )}

                  <AvatarGroup userIds={task.assignees || []} max={3} />
                </div>

                {task.latest_activity && (
                  <div className="task-footer">
                    {task.latest_activity.detail}
                  </div>
                )}

                <Button
                  icon={<CloseOutlined />}
                  type="text"
                  danger
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDelete(task);
                  }}
                />
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =====================
   STYLES HELPERS
===================== */
function headerClass(name) {
  if (name === "Đang Chờ") return "header-warning";
  if (name === "Đang Tiến Hành") return "header-primary";
  if (name === "Chờ Duyệt") return "header-info";
  if (name === "Đã Xong") return "header-success";
}

function columnClass(name) {
  if (name === "Đang Chờ") return "column-warning";
  if (name === "Đang Tiến Hành") return "column-primary";
  if (name === "Chờ Duyệt") return "column-info";
  if (name === "Đã Xong") return "column-success";
}