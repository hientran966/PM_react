import { Menu } from "antd";
import {
  UnorderedListOutlined,
  ProjectOutlined,
  CalendarOutlined,
  PieChartOutlined,
  GithubOutlined,
  FileOutlined,
  MessageOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useMemo, useState, useEffect } from "react";

import ChatService from "@/services/Chat.service";

export default function ProjectMenu({
  activeView,
  projectId,
  isExpanded,
  onUpdateView,
  onSelectChannel,
  onChatAdd,
}) {
  const [channels, setChannels] = useState([]);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.id;

  /* =====================
     LOAD CHANNELS
  ===================== */
  useEffect(() => {
    if (!projectId || !userId) return;

    async function loadChannels() {
      try {
        const res = await ChatService.getChannelsByUser(projectId, userId);
        setChannels(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error("Load channels failed:", err);
        setChannels([]);
      }
    }

    loadChannels();
  }, [projectId, userId]);

  /* =====================
     SELECTED KEY
  ===================== */
  const selectedKey = useMemo(() => {
    if (activeView === "chat") return [];
    return activeView ? [activeView] : [];
  }, [activeView]);

  /* =====================
     MENU ITEMS (antd v5)
  ===================== */
  const menuItems = useMemo(() => {
    return [
      {
        key: "kanban",
        icon: <UnorderedListOutlined />,
        label: "Danh sách Task",
      },
      {
        key: "gantt",
        icon: <ProjectOutlined />,
        label: "Gantt",
      },
      {
        key: "calendar",
        icon: <CalendarOutlined />,
        label: "Lịch",
      },
      {
        key: "report",
        icon: <PieChartOutlined />,
        label: "Thông tin",
      },
      {
        key: "github",
        icon: <GithubOutlined />,
        label: "Code",
      },
      {
        key: "file",
        icon: <FileOutlined />,
        label: "Files",
        children: [
          {
            key: "file-all",
            label: "Tất cả File",
          },
          {
            key: "file-user",
            label: "File của bạn",
          },
        ],
      },
      {
        key: "chat",
        icon: <MessageOutlined />,
        label: "Kênh thảo luận",
        children: [
          ...channels.map((ch) => ({
            key: `chat-${ch.id}`,
            label: ch.name,
          })),
          {
            key: "chat-add",
            icon: <PlusOutlined />,
            label: "Thêm kênh mới",
          },
        ],
      },
    ];
  }, [channels]);

  /* =====================
     HANDLER
  ===================== */
  const handleClick = ({ key }) => {
    if (key === "chat-add") {
      onChatAdd?.();
      return;
    }

    if (key.startsWith("chat-")) {
      const id = Number(key.replace("chat-", ""));
      const channel = channels.find(c => c.id === id);

      onUpdateView?.("chat");
      onSelectChannel?.(channel);
    }

    onUpdateView?.(key);
  };

  return (
    <Menu
      mode="inline"
      items={menuItems}
      selectedKeys={selectedKey}
      inlineCollapsed={!isExpanded}
      style={{ height: "100vh", width: isExpanded ? 200 : 64 }}
      onClick={handleClick}
    />
  );
}