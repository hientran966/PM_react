import { useEffect, useState } from "react";
import { Card, Avatar, Divider, Tag } from "antd";

import AccountService from "@/services/Account.service";
import FileService from "@/services/File.service";

import '@/assets/css/UserTooltip.css'
import defaultAvatar from "@/assets/default-avatar.png";

export default function UserTooltip({ userId, projectId }) {
  const [user, setUser] = useState({});
  const [stats, setStats] = useState({});
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);

  async function loadAvatar(id) {
    try {
      const res = await FileService.getAvatar(id);
      setAvatarUrl(res?.file_url || defaultAvatar);
    } catch {
      setAvatarUrl(defaultAvatar);
    }
  }

  async function fetchData() {
    if (!userId || !projectId) return;

    try {
      const [userRes, statsRes] = await Promise.all([
        AccountService.getAccountById(userId),
        AccountService.getStats(userId, projectId),
      ]);

      setUser(userRes || {});
      setStats(statsRes || {});
      await loadAvatar(userId);
    } catch (err) {
      console.error("UserTooltip error:", err);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, projectId]);

  return (
    <Card className="user-tooltip-card" hoverable>
      <div className="tooltip-header">
        <Avatar size={60} src={avatarUrl} />
        <div className="tooltip-info">
          <div className="user-name">{user.name || "—"}</div>
          <div className="user-email">{user.email || "—"}</div>
          {stats.role && <Tag>{stats.role}</Tag>}
        </div>
      </div>

      <Divider />

      <div className="tooltip-stats">
        <div className="stat-item">
          <div className="stat-number">{stats.tasks ?? 0}</div>
          <div className="stat-label">Tasks</div>
        </div>
      </div>
    </Card>
  );
}