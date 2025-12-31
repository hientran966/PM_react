import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { message } from "antd";

import { getSocket } from "@/plugins/socket";

import TaskService from "@/services/Task.service";
import MemberService from "@/services/Member.service";
import ChatService from "@/services/Chat.service";
import ProjectService from "@/services/Project.service";

/* components */
import TaskMenu from "@/components/TaskMenu";
import Header from "@/components/Header";
import TaskKanban from "@/components/TaskKanban";
import Timeline from "@/components/Timeline";
import TaskGantt from "@/components/TaskGantt";
import Report from "@/components/Report";
import GitHubIntegration from "@/components/GitHubIntegration";
import FileList from "@/components/FileList";
import Chat from "@/components/Chat";

/* modals */
import EditProject from "@/components/EditProject";
import TaskForm from "@/components/TaskForm";
import ChannelForm from "@/components/ChannelForm";
import ChannelMemberList from "@/components/ChannelMemberList";
import MemberList from "@/components/MemberList";
import TaskDetail from "@/components/TaskDetail";

import "@/assets/css/TaskLayout.css";

export default function TaskLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const projectId = Number(id);
  const user = JSON.parse(localStorage.getItem("user") || "{id: 1}");
  const userId = user?.id;

  /* ================= STATE ================= */
  const [activeView, setActiveView] = useState("kanban");
  const [selectedChannel, setSelectedChannel] = useState(null);

  const [project, setProject] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);

  const [projectOpen, setProjectOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [addChannel, setAddChannel] = useState(false);
  const [editChannel, setEditChannel] = useState(false);

  const [channelMemberOpen, setChannelMemberOpen] = useState(false);
  const [memberListOpen, setMemberListOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const [isExpanded, setIsExpanded] = useState(true);

  /* ================= LOADERS ================= */
  const loadProject = async () => {
    try {
      const data = await ProjectService.getProjectById(projectId);
      setProject(data ? data : {});
    } catch (err) {
      console.error("Load project error", err);
    }
  };

  const loadTasks = async () => {
    try {
      const data = await TaskService.getByProject(projectId);
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load task error", err);
    }
  };

  const loadMembers = async () => {
    try {
      if (activeView === "chat" && selectedChannel) {
        const res = await ChatService.getChannelMembers(selectedChannel);
        setMembers(Array.isArray(res) ? res : []);
        return;
      }

      const res = await MemberService.getByProjectId(projectId);
      setMembers(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Load member error", err);
    }
  };

  const loadChannels = async () => {
    try {
      await ChatService.getChannelsByUser(projectId, userId);
    } catch (err) {
      console.error("Load channel error", err);
    }
  };

  /* ================= EFFECT: PROJECT ================= */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProject();
  }, [projectId]);

  /* ================= EFFECT: TASKS ================= */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTasks();
  }, [projectId]);

  /* ================= EFFECT: MEMBERS ================= */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMembers();
  }, [projectId, activeView, selectedChannel]);

  /* ================= EFFECT: CHANNELS ================= */
  useEffect(() => {
    if (activeView === "chat") {
      loadChannels();
    }
  }, [activeView, projectId]);

  /* ================= EFFECT: SOCKET ================= */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const refresh = async () => {
      await loadTasks();
      await loadMembers();
    };

    socket.on("project_accepted", refresh);
    socket.on("task_updated", refresh);

    return () => {
      socket.off("project_accepted", refresh);
      socket.off("task_updated", refresh);
    };
  }, [projectId, activeView, selectedChannel]);

  /* ================= EFFECT: QUERY PARAM ================= */
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const taskId = params.get("task");
    if (taskId) {
      const task = tasks.find(t => t.id === Number(taskId));
      if (task) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedTask(task);
        setDetailVisible(true);
      }
      params.delete("task");
      navigate({ search: params.toString() }, { replace: true });
    }

    const channelId = params.get("channel");
    if (channelId) {
      (async () => {
        const channel = await ChatService.getChannelById(channelId);
        setActiveView("chat");
        setSelectedChannel(channel);
      })();

      params.delete("channel");
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [location.search, tasks]);

  /* ================= ACTIONS ================= */
  const onDeleteProject = async () => {
    try {
      await ProjectService.deleteProject(projectId, userId);
      message.success("Xóa project thành công");
      navigate("/projects");
    } catch {
      message.error("Xóa project thất bại");
    }
  };

  const onDeleteChannel = async (channelId) => {
    try {
      await ChatService.deleteChannel(channelId);
      setSelectedChannel(null);
      setActiveView("kanban");
      message.success("Xóa kênh thành công");
    } catch {
      message.error("Xóa kênh thất bại");
    }
  };

  /* ================= RENDER ================= */
  return (
    <div className="task-layout">
      <TaskMenu
        activeView={activeView}
        projectId={projectId}
        isExpanded={isExpanded}
        onUpdateView={setActiveView}
        onSelectChannel={setSelectedChannel}
        onChatAdd={() => setAddChannel(true)}
      />

      <div
        className="main-content"
        style={{ maxWidth: `calc(100vw - ${isExpanded ? 280 : 140}px)` }}
      >
        <Header
          page="task"
          view={activeView}
          project={project}
          channel={selectedChannel}
          members={members}
          isExpanded={isExpanded}

          onEditProject={() => setProjectOpen(true)}
          onDeleteProject={onDeleteProject}
          onEditChannel={() => setEditChannel(true)}
          onDeleteChannel={onDeleteChannel}
          onAdd={() => setTaskOpen(true)}
          onMemberClick={() =>
            activeView === "chat"
              ? setChannelMemberOpen(true)
              : setMemberListOpen(true)
          }
          onToggleMenu={() => setIsExpanded(v => !v)}
        />

        <div className="content-body">
          {activeView === "kanban" && (
            <TaskKanban
              tasks={tasks}
              projectId={projectId}
              onOpenDetail={(task) => {
                setSelectedTask(task);
                setDetailVisible(true);
              }}
              onUpdateTask={loadTasks}
            />
          )}

          {activeView === "timeline" && (
            <Timeline projectId={projectId} tasks={tasks} />
          )}

          {activeView === "gantt" && (
            <TaskGantt projectId={projectId} tasks={tasks} />
          )}

          {activeView === "report" && <Report projectId={projectId} />}

          {activeView === "github" && <GitHubIntegration />}

          {activeView === "file-all" && <FileList projectId={projectId} />}

          {activeView === "file-user" && (
            <FileList projectId={projectId} userId={userId} />
          )}

          {activeView === "chat" && selectedChannel && (
            <Chat
              projectId={projectId}
              channelId={selectedChannel}
              currentUserId={userId}
            />
          )}
        </div>
      </div>

      {/* ================= MODALS ================= */}
      <EditProject
        open={projectOpen}
        projectId={projectId}
        onClose={setProjectOpen}
      />

      <TaskForm
        open={taskOpen}
        projectId={projectId}
        onClose={setTaskOpen}
        onAdded={loadTasks}
      />

      <ChannelForm
        open={addChannel}
        projectId={projectId}
        onClose={setAddChannel}
      />

      <ChannelForm
        open={editChannel}
        projectId={projectId}
        channelId={selectedChannel}
        onClose={setEditChannel}
      />

      <ChannelMemberList
        open={channelMemberOpen}
        projectId={projectId}
        channelId={selectedChannel}
        onClose={setChannelMemberOpen}
        onUpdated={loadMembers}
      />

      <MemberList
        open={memberListOpen}
        projectId={projectId}
        onClose={setMemberListOpen}
        onUpdated={loadMembers}
      />

      {selectedTask && (
        <TaskDetail
          open={detailVisible}
          taskId={selectedTask.id}
          projectId={projectId}
          onClose={setDetailVisible}
        />
      )}
    </div>
  );
}