import { Card, Calendar, Modal } from "antd";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useDispatch } from "react-redux";

import { loadTasks } from "@/stores/taskSlice";
import { getSocket } from "@/plugins/socket";

import "@/assets/css/TaskCalendar.css";

export default function TaskCalendar({ projectId, tasks = [] }) {
  const dispatch = useDispatch();

  const [value, setValue] = useState(dayjs());
  const [modal, setModal] = useState({
    open: false,
    title: "",
    content: "",
  });

  /* =====================
     DATE UTILS (LOCAL)
  ===================== */
  const formatLocalDate = (d) =>
    dayjs(d).format("YYYY-MM-DD");

  const getTasksForDate = (date) => {
    const target = formatLocalDate(date);

    return tasks.filter((task) => {
      if (!task.start_date) return false;
      const start = formatLocalDate(task.start_date);
      const end = task.due_date
        ? formatLocalDate(task.due_date)
        : start;

      return target >= start && target <= end;
    });
  };

  /* =====================
     STATUS COLOR
  ===================== */
  const getStatusColor = (status) => {
    switch (status) {
      case "todo":
        return "#f56c6c";
      case "in_progress":
        return "#e6a23c";
      case "done":
        return "#67c23a";
      default:
        return "#909399";
    }
  };

  /* =====================
     CLICK DAY
  ===================== */
  const showTasksOfDay = (date) => {
    const list = getTasksForDate(date);
    const formatted = dayjs(date).format("DD/MM/YYYY");

    let html = "";

    if (!list.length) {
      html = `<div style="color:#909399;text-align:center;padding:8px 0;">
        Không có công việc nào trong ngày này.
      </div>`;
    } else {
      html = list
        .map(
          (t) => `
          <div style="margin-bottom:6px">
            <b>${t.title}</b> — <i>${t.latest_progress ?? 0}%</i>
            <span style="color:${getStatusColor(t.status)}">
              (${t.status})
            </span>
          </div>`
        )
        .join("");
    }

    setModal({
      open: true,
      title: `Công việc ngày ${formatted}`,
      content: html,
    });
  };

  /* =====================
     CALENDAR CELL
  ===================== */
  const dateCellRender = (date) => {
    const list = getTasksForDate(date);

    if (!list.length) return null;

    return (
      <div className="calendar-cell">
        {list.slice(0, 2).map((task) => (
          <div
            key={task.id}
            className="task-item"
            style={{ backgroundColor: getStatusColor(task.status) }}
          >
            <span className="task-title">{task.title}</span>
            <span className="task-progress">
              {task.latest_progress ?? 0}%
            </span>
          </div>
        ))}

        {list.length > 2 && (
          <div className="more-tasks">
            + {list.length - 2} công việc khác
          </div>
        )}
      </div>
    );
  };

  /* =====================
     LOAD + SOCKET
  ===================== */
  useEffect(() => {
    dispatch(loadTasks(projectId));

    const socket = getSocket();
    if (!socket) return;

    const handler = () => dispatch(loadTasks(projectId));
    socket.on("task_updated", handler);

    return () => socket.off("task_updated", handler);
  }, [dispatch, projectId]);

  /* =====================
     RENDER
  ===================== */
  return (
    <div className="calendar-container">
      <Card>
        <Calendar
          value={value}
          onChange={setValue}
          dateCellRender={dateCellRender}
          onSelect={showTasksOfDay}
        />
      </Card>

      <Modal
        open={modal.open}
        title={modal.title}
        footer={null}
        onCancel={() => setModal({ ...modal, open: false })}
      >
        <div
          dangerouslySetInnerHTML={{ __html: modal.content }}
        />
      </Modal>
    </div>
  );
}