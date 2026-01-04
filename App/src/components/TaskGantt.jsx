/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";

import { loadTasks } from "@/stores/taskSlice";
import { getSocket } from "@/plugins/socket";

import AvatarGroup from "./AvatarGroup";

import "@/assets/css/TaskGantt.css";

const COLUMN_WIDTH = 40;

export default function TaskGantt({ projectId, tasks = [] }) {
  const dispatch = useDispatch();
  const timelineRef = useRef(null);

  const [timelineStart, setTimelineStart] = useState(null);
  const [timelineEnd, setTimelineEnd] = useState(null);

  /* =====================
     DATE UTILS
  ===================== */
  const getDaysDiff = (d1, d2) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    date1.setHours(0, 0, 0, 0);
    date2.setHours(0, 0, 0, 0);
    return Math.round((date2 - date1) / 86400000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "short",
    });
  };

  /* =====================
     TIMELINE RANGE
  ===================== */
  useEffect(() => {
    if (!tasks.length) return;

    const withDates = tasks.filter(t => t.start_date && t.due_date);

    if (withDates.length) {
      const starts = withDates.map(t => new Date(t.start_date));
      const ends = withDates.map(t => new Date(t.due_date));

      setTimelineStart(new Date(Math.min(...starts)));
      setTimelineEnd(new Date(Math.max(...ends)));
    } else {
      const today = new Date();
      setTimelineStart(new Date(today.getFullYear(), today.getMonth(), 1));
      setTimelineEnd(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    }
  }, [tasks]);

  /* =====================
     CALENDAR DATA
  ===================== */
  const calendarData = useMemo(() => {
    if (!timelineStart || !timelineEnd) {
      return { days: [] };
    }

    const days = [];
    const current = new Date(timelineStart);
    const end = new Date(timelineEnd);

    const weekdayVN = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

    while (current <= end) {
      const d = new Date(current);

      days.push({
        label: weekdayVN[d.getDay()],
        dayNumber: d.getDate(),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: d.toDateString() === new Date().toDateString(),
      });

      current.setDate(current.getDate() + 1);
    }

    return { days };
  }, [timelineStart, timelineEnd]);

  /* =====================
     TODAY MARKER
  ===================== */
  const todayPosition = useMemo(() => {
    if (!timelineStart) return -1;
    const diff = getDaysDiff(timelineStart, new Date());
    if (diff < 0) return -1;
    return diff * COLUMN_WIDTH + COLUMN_WIDTH / 2;
  }, [timelineStart]);

  /* =====================
     BAR STYLES
  ===================== */
  const getBarStyle = (task) => {
    const invalid = !task.start_date || !task.due_date;

    const start = invalid
      ? new Date(timelineStart)
      : new Date(task.start_date);

    const end = invalid
      ? new Date(timelineStart)
      : new Date(task.due_date);

    const offset = getDaysDiff(timelineStart, start);
    const duration = getDaysDiff(start, end) + 1;

    return {
      left: offset * COLUMN_WIDTH,
      width: duration * COLUMN_WIDTH,
      backgroundColor: invalid ? "#ffa94d" : "#5ea2ff",
      opacity: invalid ? 0.75 : 0.9,
      border: invalid ? "1px dashed #ff922b" : "none",
    };
  };

  const getProgressStyle = (task) => {
    const invalid = !task.start_date || !task.due_date;

    return {
      width: `${task.latest_progress || 0}%`,
      backgroundColor: invalid ? "#ff922b" : "#3b82f6",
    };
  };

  /* =====================
     SOCKET
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
    <div className="gantt-container">
      {/* ===== SIDEBAR ===== */}
      <div className="gantt-sidebar">
        <div className="sidebar-header">
          <div className="col-task">Task</div>
          <div className="col-assignee">Tham gia</div>
          <div className="col-date">Bắt đầu</div>
          <div className="col-date">Hạn chót</div>
        </div>

        <div className="sidebar-body">
          {tasks.map(task => (
            <div key={task.id} className="sidebar-row">
              <div className="col-task">{task.title}</div>
              <div className="col-assignee">
                <AvatarGroup
                  userIds={task.assignees || []}
                  max={3}
                  size={28}
                />
              </div>
              <div className="col-date">
                {formatDate(task.start_date)}
              </div>
              <div className="col-date">
                {formatDate(task.due_date)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== TIMELINE ===== */}
      <div className="gantt-timeline" ref={timelineRef}>
        <div className="timeline-header">
          <div
            className="header-dates"
            style={{
              gridTemplateColumns: `repeat(${calendarData.days.length}, ${COLUMN_WIDTH}px)`,
            }}
          >
            {calendarData.days.map((d, i) => (
              <div key={i} className="date-block">
                {d.dayNumber}
              </div>
            ))}
          </div>

          <div
            className="header-days"
            style={{
              gridTemplateColumns: `repeat(${calendarData.days.length}, ${COLUMN_WIDTH}px)`,
            }}
          >
            {calendarData.days.map((d, i) => (
              <div
                key={i}
                className={`day-block ${
                  d.isWeekend ? "is-weekend" : ""
                } ${d.isToday ? "is-today" : ""}`}
              >
                {d.label}
              </div>
            ))}
          </div>

          {todayPosition >= 0 && (
            <div
              className="today-marker-line"
              style={{ left: todayPosition }}
            >
              <div className="today-head" />
            </div>
          )}
        </div>

        <div className="timeline-body">
          <div className="grid-background">
            {calendarData.days.map((_, i) => (
              <div key={i} className="grid-column" />
            ))}
          </div>

          {tasks.map(task => (
            <div key={task.id} className="timeline-row">
              <div className="task-bar" style={getBarStyle(task)}>
                <div
                  className="task-bar-progress"
                  style={getProgressStyle(task)}
                />
                <div className="task-bar-label">
                  {task.latest_progress || 0}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
