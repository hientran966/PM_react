import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Popover } from "antd";

import FileService from "@/services/File.service";
import UserTooltip from "@/components/UserTooltip";

import defaultAvatar from "@/assets/default-avatar.png";
import "@/assets/css/AvatarGroup.css";

export default function AvatarGroup({
  userIds = [],
  userNameMap = {},
  projectId,
  size = 28,
  max = 3,
  tooltips = true,
}) {
  const [avatarsMap, setAvatarsMap] = useState({});
  const namesMapRef = useRef(userNameMap);

  /* ================= Load avatars ================= */
  useEffect(() => {
    if (!userIds.length) return;

    const uniqueIds = [...new Set(userIds)];
    let cancelled = false;

    async function loadAvatars() {
      const results = {};

      await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            const res = await FileService.getAvatar(id);
            results[id] = res?.file_url || defaultAvatar;
          } catch {
            results[id] = defaultAvatar;
          }
        })
      );

      if (!cancelled) setAvatarsMap(results);
    }

    loadAvatars();
    return () => {
      cancelled = true;
    };
  }, [userIds]);

  /* ================= Sync name map ================= */
  useEffect(() => {
    namesMapRef.current = userNameMap || {};
  }, [userNameMap]);

  const getAvatar = (id) => avatarsMap[id] || defaultAvatar;

  /* ================= Visible ================= */
  const visibleIds = useMemo(
    () => userIds.slice(0, max),
    [userIds, max]
  );

  /* ================= Render ================= */
  return (
    <Avatar.Group
      max={{
        count: max,
        style: {
          backgroundColor: "#f0f0f0",
          color: "#555",
          cursor: "default",
        },
      }}
    >
      {visibleIds.map((userId) => {
        const avatar = (
          <Avatar
            key={userId}
            src={getAvatar(userId)}
            size={size}
          />
        );

        if (!tooltips) return avatar;

        return (
          <Popover
            key={userId}
            placement="top"
            mouseEnterDelay={0}
            mouseLeaveDelay={0}
            content={
              <UserTooltip
                userId={userId}
                projectId={projectId}
              />
            }
          >
            {avatar}
          </Popover>
        );
      })}
    </Avatar.Group>
  );
}