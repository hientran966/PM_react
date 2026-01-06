/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { Input } from "antd";

const { TextArea } = Input;

import "@/assets/css/MentionInput.css";

export default function MentionInput({
  value,
  onChange,
  users = [],
  placeholder = "",
  onMention,
}) {
  const [content, setContent] = useState(value || "");
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const currentUser =
    JSON.parse(localStorage.getItem("user") || "{}") || {};
  const userId = currentUser?.id;

  /* =====================
     SYNC CONTROLLED VALUE
  ===================== */
  useEffect(() => {
    if (value !== content) {
      setContent(value || "");
    }
  }, [value]);

  /* =====================
     HANDLE INPUT
  ===================== */
  const handleChange = (e) => {
    const val = e.target.value;
    setContent(val);
    onChange?.(val);

    const match = val.match(/@([^\s@]*)$/);
    if (match) {
      setQuery(match[1]);
      setShowDropdown(true);
      setActiveIndex(0);
    } else {
      setShowDropdown(false);
    }
  };

  /* =====================
     FILTER USERS
  ===================== */
  const filteredUsers = useMemo(() => {
    const q = query.toLowerCase();

    let list = users
      .filter((u) => u.user_id !== userId)
      .filter((u) => u.name.toLowerCase().includes(q));

    if ("all".startsWith(q)) {
      list = [{ user_id: "all", name: "All" }, ...list];
    }

    return list;
  }, [users, query, userId]);

  /* =====================
     CHOOSE USER
  ===================== */
  const chooseUser = (user) => {
    let next;

    if (user.user_id === "all") {
      next = content.replace(/@(\w*)$/, "@All ");
    } else {
      next = content.replace(
        /@(\w*)$/,
        `<@user:${user.user_id}> `
      );
    }

    setContent(next);
    onChange?.(next);
    onMention?.(user);

    setShowDropdown(false);
  };

  /* =====================
     KEYBOARD NAV
  ===================== */
  const handleKeyDown = (e) => {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) =>
        Math.min(i + 1, filteredUsers.length - 1)
      );
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const user = filteredUsers[activeIndex];
      if (user) chooseUser(user);
    }
  };

  /* =====================
     RENDER
  ===================== */
  return (
    <div style={{ position: "relative" }}>
      <TextArea
        rows={2}
        value={content}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />

      {showDropdown && filteredUsers.length > 0 && (
        <div className="mention-dropdown">
          {filteredUsers.map((u, idx) => (
            <div
              key={u.user_id}
              className={`mention-item ${
                idx === activeIndex ? "active" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                chooseUser(u);
              }}
            >
              {u.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
