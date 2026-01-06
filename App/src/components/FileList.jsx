import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Empty } from "antd";

import { getSocket } from "@/plugins/socket";
import {
  loadFiles,
  loadFilesByProject,
  loadFilesByUser,
} from "@/stores/fileSlice";

import {
  selectFilesByTask,
  selectFilesByProject,
  selectFilesByUser,
} from "@/stores/fileSelectors";

import FileCard from "@/components/FileCard";

import "@/assets/css/FileList.css";

export default function FileList({
  projectId = null,
  taskId = null,
  userId = null,
}) {
  const dispatch = useDispatch();

  /* ================= SELECT FILES ================= */

  const filesByTask = useSelector((state) =>
    taskId ? selectFilesByTask(state, taskId) : []
  );

  const filesByProject = useSelector((state) =>
    projectId && !userId
      ? selectFilesByProject(state, projectId)
      : []
  );

  const filesByUser = useSelector((state) =>
    projectId && userId
      ? selectFilesByUser(state, projectId, userId)
      : []
  );

  const files = useMemo(() => {
    if (taskId) return filesByTask;
    if (projectId && userId) return filesByUser;
    if (projectId) return filesByProject;
    return [];
  }, [taskId, projectId, userId, filesByTask, filesByProject, filesByUser]);

  /* ================= LOAD FILES ================= */

  const fetchFiles = async () => {
    try {
      if (taskId) {
        dispatch(loadFiles(taskId));
      } else if (projectId && !userId) {
        dispatch(loadFilesByProject(projectId));
      } else if (projectId && userId) {
        dispatch(loadFilesByUser({ projectId, userId }));
      }
    } catch (err) {
      console.error("Lỗi khi tải file:", err);
    }
  };

  /* ================= LIFECYCLE ================= */

  useEffect(() => {
    fetchFiles();

    const socket = getSocket();
    if (!socket) return;

    const reload = () => fetchFiles();
    socket.on("file", reload);

    return () => {
      socket.off("file", reload);
    };
  }, [taskId, projectId, userId]);

  /* ================= RENDER ================= */

  return (
    <div className="file-list-view">
      {files.length ? (
        <div className="file-grid">
          {files.map((f) => (
            <FileCard key={f.id} file={f} size="large" />
          ))}
        </div>
      ) : (
        <div className="no-file">
          <Empty description="Chưa có file nào được tải lên" />
        </div>
      )}
    </div>
  );
}