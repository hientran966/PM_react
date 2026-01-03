/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Input,
  Button,
  Select,
  Tabs,
  Tag,
  Divider,
  message,
} from "antd";
import { EditOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";

import {
  loadTasks,
  updateTask,
} from "@/stores/taskSlice";
import { loadFiles } from "@/stores/fileSlice";
import { selectFilesByTask } from "@/stores/fileSelectors";
import { loadActivity } from "@/stores/activitySlice";
import { selectActivityByTask } from "@/stores/activitySelectors";
import { loadComments, addComment } from "@/stores/commentSlice";
import { selectCommentsByTask } from "@/stores/commentSelectors";
import { selectProjectById } from "@/stores/projectSelectors";

export default function TaskDetailModal({
  open,
  onClose,
  projectId,
  taskId,
}) {
  const dispatch = useDispatch();

  /* =====================
     STATE
  ===================== */
  const [editKey, setEditKey] = useState(null);
  const [editCache, setEditCache] = useState({});
  const [rightTab, setRightTab] = useState("activity");
  const [newComment, setNewComment] = useState("");

  /* =====================
     STORE SELECTORS
  ===================== */
  const project = useSelector((s) => selectProjectById(s, projectId));
  const tasks = useSelector((s) => s.task.tasksByProject[projectId] || []);
  const task = tasks.find((t) => t.id === taskId);

  const files = useSelector((s) => selectFilesByTask(s, taskId));
  const activities = useSelector((s) => selectActivityByTask(taskId)(s));
  const comments = useSelector((s) => selectCommentsByTask(s, taskId));

  /* =====================
     LOAD DATA
  ===================== */
  useEffect(() => {
    if (!open || !taskId) return;

    dispatch(loadTasks(projectId));
    dispatch(loadFiles(taskId));
    dispatch(loadActivity(taskId));
    dispatch(loadComments(taskId));

    setEditKey(null);
    setEditCache({});
    setRightTab("activity");
  }, [open, taskId, projectId]);

  if (!task) return null;

  /* =====================
     HELPERS
  ===================== */
  const priorityLabel = (p) =>
    p === "high" ? "Cao" : p === "medium" ? "Trung Bình" : "Thấp";

  const saveField = async (key) => {
    const payload = {
      projectId,
      updatedTask: {
        id: task.id,
        changedField: key,
        [key]: editCache[key],
      },
    };

    await dispatch(updateTask(payload));
    message.success("Đã cập nhật");
    setEditKey(null);
  };

  /* =====================
     RENDER
  ===================== */
  return (
    <Modal
      open={open}
      onCancel={() => onClose(false)}
      width={1000}
      footer={null}
      destroyOnHidden
    >
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {editKey !== "title" ? (
          <>
            <h3># {task.id} - {task.title}</h3>
            <Button
              icon={<EditOutlined />}
              type="link"
              onClick={() => {
                setEditKey("title");
                setEditCache({ title: task.title });
              }}
            />
          </>
        ) : (
          <>
            <Input
              value={editCache.title}
              onChange={(e) =>
                setEditCache({ title: e.target.value })
              }
              style={{ width: 400 }}
            />
            <Button
              icon={<CheckOutlined />}
              type="link"
              onClick={() => saveField("title")}
            />
            <Button
              icon={<CloseOutlined />}
              type="link"
              onClick={() => setEditKey(null)}
            />
          </>
        )}
      </div>

      <Divider />

      <div style={{ display: "flex", height: 600 }}>
        {/* LEFT */}
        <div style={{ width: 650, paddingRight: 16, overflowY: "auto" }}>
          {/* DESCRIPTION */}
          <strong>Mô tả</strong>
          {editKey !== "description" ? (
            <>
              <p>{task.description || "Chưa có mô tả"}</p>
              <Button
                icon={<EditOutlined />}
                type="link"
                onClick={() => {
                  setEditKey("description");
                  setEditCache({ description: task.description });
                }}
              />
            </>
          ) : (
            <>
              <Input.TextArea
                rows={4}
                value={editCache.description}
                onChange={(e) =>
                  setEditCache({ description: e.target.value })
                }
              />
              <Button onClick={() => saveField("description")} type="primary">
                Lưu
              </Button>
            </>
          )}

          <Divider />

          {/* INFO */}
          <p>
            <b>Ưu tiên:</b>{" "}
            <Tag color={
              task.priority === "high" ? "red" :
              task.priority === "medium" ? "orange" : "green"
            }>
              {priorityLabel(task.priority)}
            </Tag>
          </p>

          <p>
            <b>Thời gian:</b>{" "}
            {task.start_date} → {task.due_date}
          </p>

          <p>
            <b>Tiến độ:</b> {task.latest_progress ?? 0}%
          </p>
        </div>

        {/* RIGHT */}
        <div style={{ width: 300, borderLeft: "1px solid #eee" }}>
          <Tabs
            activeKey={rightTab}
            onChange={setRightTab}
            items={[
              {
                key: "activity",
                label: "Hoạt động",
                children: activities.map((a) => (
                  <div key={a.id}>
                    <b>{a.user?.name}</b>
                    <div>{a.detail}</div>
                    <small>{a.created_at}</small>
                    <Divider />
                  </div>
                )),
              },
              {
                key: "comment",
                label: "Bình luận",
                children: (
                  <>
                    {comments.map((c) => (
                      <div key={c.id}>
                        <b>{c.user?.name}</b>
                        <div>{c.content}</div>
                        <small>{c.created_at}</small>
                        <Divider />
                      </div>
                    ))}

                    <Input.TextArea
                      rows={2}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Button
                      type="primary"
                      disabled={!newComment.trim()}
                      onClick={() => {
                        dispatch(
                          addComment({
                            taskId,
                            payload: {
                              task_id: taskId,
                              content: newComment,
                              project_id: projectId,
                            },
                          })
                        );
                        setNewComment("");
                      }}
                    >
                      Gửi
                    </Button>
                  </>
                ),
              },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
}