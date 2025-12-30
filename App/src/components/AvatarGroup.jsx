import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Popover } from "antd";

import FileService from "@/services/File.service";

import UserTooltip from "@/components/UserTooltip";

import '@/assets/css/AvatarGroup.css'
import defaultAvatar from "@/assets/default-avatar.png";

export default function AvatarGroup({
  userIds = [],
  userNameMap = {},
  projectId,
  size = 28,
  max = 3,
  tooltips = true
}) {
  const [avatarsMap, setAvatarsMap] = useState({});
  const namesMapRef = useRef(userNameMap);

  /* ================= Load avatars ================= */
  useEffect(() => {
    if (!userIds?.length) return;

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

  /* ================= Visible & extra ================= */
  const visibleIds = useMemo(
    () => userIds.slice(0, max),
    [userIds, max]
  );

  const extraCount = Math.max(0, userIds.length - visibleIds.length);

  /* ================= Render ================= */
  return (
    <div className="avatar-group">
      {visibleIds.map((userId, index) => {
        const avatarNode = (
          <Avatar
            key={userId}
            src={getAvatar(userId)}
            size={size}
            style={{ zIndex: visibleIds.length - index }}
          />
        );

        if (!tooltips) return avatarNode;

        return (
            <Popover
            placement="top"
            overlayClassName="user-tooltip-popper"
            mouseEnterDelay={0}
            mouseLeaveDelay={0}
            content={
                <UserTooltip
                userId={userId}
                projectId={projectId}
                />
            }
            >
                {avatarNode}
            </Popover>
        );
      })}

      {extraCount > 0 && (
        <Avatar size={size} className="extra-avatar">
          +{extraCount}
        </Avatar>
      )}
    </div>
  );
}