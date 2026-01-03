/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { notification } from "antd";

import SideBar from "@/components/SideBar";

import { initSocket, disconnectSocket } from "@/plugins/socket";

/* =======================
   Redux actions
======================= */
import {
  fetchNotifications,
  addNotification,
} from "@/stores/notificationSlice";

import { loadTasks } from "@/stores/taskSlice";
import { fetchProjects } from "@/stores/projectSlice";
import { fetchInvites } from "@/stores/inviteSlice";

import "@/assets/css/App.css";

function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  /* =======================
     Layout
  ======================= */
  //const isEmptyLayout = location.state?.layout === "empty";

  /* =======================
     Auth
  ======================= */
  const newCount = useSelector((state) => state.notification.newCount);

  /* =======================
     Socket + Store logic
  ======================= */
  useEffect(() => {
    let socket;

    dispatch(fetchNotifications());

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?.id) return;

    socket = initSocket(user.id);

    socket.on("notification", async (data) => {
      notification.open({
        message: data.title || "Thông báo mới",
        description: data.message || "Bạn có thông báo mới",
        type: data.type || "info",
        duration: 4,
        onClick: () => navigate("/notifications"),
      });

      dispatch(addNotification(data));

      switch (data.type) {
        case "task_assigned":
        case "task_updated":
          if (data.project_id) {
            dispatch(loadTasks(data.project_id));
          }
          break;

        case "project_updated":
          dispatch(fetchProjects());
          break;

        case "project_invite":
          dispatch(fetchInvites());
          break;

        default:
          break;
      }
    });

    socket.on("task_updated", (data) => {
      const projectId = data.project_id || data.task?.project_id;
      if (projectId) {
        dispatch(loadTasks(projectId));
      }
    });

    return () => {
      disconnectSocket();
    };
  }, []);

  /* =======================
     Lifecycle
  ======================= */
  useEffect(() => {
    //window.addEventListener("auth-changed", checkAuth);
    window.addEventListener("forbidden", () => {
      navigate("/not-found", { replace: true });
    });

    return () => {
      //window.removeEventListener("auth-changed", checkAuth);
      disconnectSocket();
    };
  }, []);

  /* =======================
     Render
  ======================= */
  return (
    <div className="common-layout">
      <div className="sidebar">
        <SideBar unreadCount={newCount ? newCount : 1} />
      </div>

      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}

export default App;
