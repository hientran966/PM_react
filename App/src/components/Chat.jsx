import { useEffect, useRef, useState } from "react";
import { Avatar, Button, Upload, message as AntMessage } from "antd";
import { PaperClipOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

import {
  loadChats,
  appendChat,
} from "@/stores/chatSlice";
import { selectChatByChannel } from "@/stores/chatSelectors";

import ChatService from "@/services/Chat.service";
import { getSocket } from "@/plugins/socket";

import MentionInput from "@/components/MentionInput";
import FileCard from "@/components/FileCard";

import "@/assets/css/Chat.css";
import defaultAvatar from "@/assets/default-avatar.png";

export default function Chat({
  projectId,
  channelId,
  currentUserId,
}) {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const messages = useSelector((state) =>
    selectChatByChannel(state, channelId)
  );

  const [members, setMembers] = useState([]);
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);

  const scrollbarRef = useRef(null);
  const messageRefs = useRef(new Map());

  const hasTargetOnOpen = useRef(false);
  const targetMessageId = useRef(null);
  const lockScrollBottom = useRef(false);

  const socketRef = useRef(null);

  /* =====================
     LOAD MEMBERS
  ===================== */
  const loadMembers = async () => {
    try {
      const res = await ChatService.getChannelMembers(channelId);
      setMembers(res || []);
    } catch {
      AntMessage.error("Không thể tải danh sách thành viên");
    }
  };

  /* =====================
     SOCKET HANDLER
  ===================== */
  const handleIncomingMessage = (msg) => {
    if (msg.channel_id !== channelId) return;
    if (msg.sender_id === currentUserId) return;

    dispatch(appendChat({ channelId, chat: msg }));
    scrollToBottom();
  };

  /* =====================
     SCROLL
  ===================== */
  const scrollToBottom = () => {
    if (lockScrollBottom.current) return;
    requestAnimationFrame(() => {
      const el = scrollbarRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const scrollToMessage = (id) => {
    requestAnimationFrame(() => {
      const wrap = scrollbarRef.current;
      const target = messageRefs.current.get(id);
      if (!wrap || !target) return;

      const offset =
        target.offsetTop - wrap.offsetTop - 20;

      wrap.scrollTop = offset;
      target.classList.add("highlight");

      setTimeout(() => target.classList.remove("highlight"), 600);
    });
  };

  /* =====================
     SEND MESSAGE
  ===================== */
  const sendMessage = async () => {
    if (!text.trim() && !files.length) return;

    try {
      setSending(true);
      const saved = await ChatService.sendMessageWithFiles({
        project_id: projectId,
        channel_id: channelId,
        sender_id: currentUserId,
        content: text,
        files,
      });

      dispatch(appendChat({ channelId, chat: saved }));

      setText("");
      setFiles([]);
      scrollToBottom();
    } catch {
      AntMessage.error("Không thể gửi tin nhắn");
    } finally {
      setSending(false);
    }
  };

  /* =====================
     PARSE MENTION
  ===================== */
  const parseMentions = (text) => {
    if (!text) return "";

    return text.replace(/<@user:(\d+)>/g, (_, id) => {
      const user = members.find(
        (u) => String(u.user_id) === String(id)
      );
      return `<span class="mention">@${user?.name || "unknown"}</span>`;
    });
  };

  /* =====================
     EFFECT: INIT
  ===================== */
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get("message")) {
      hasTargetOnOpen.current = true;
      targetMessageId.current = Number(query.get("message"));
    }

    socketRef.current = getSocket();

    dispatch(loadChats(channelId));
    loadMembers();

    if (socketRef.current) {
      socketRef.current.emit("join_channel", channelId);
      socketRef.current.on("chat_message", handleIncomingMessage);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("chat_message", handleIncomingMessage);
        socketRef.current.emit("leave_channel", channelId);
      }
    };
  }, [channelId]);

  /* =====================
     EFFECT: TARGET MESSAGE
  ===================== */
  useEffect(() => {
    if (!hasTargetOnOpen.current || !targetMessageId.current) return;

    const exists = messages.some(
      (m) => m.id === targetMessageId.current
    );
    if (!exists) return;

    lockScrollBottom.current = true;
    scrollToMessage(targetMessageId.current);

    hasTargetOnOpen.current = false;
    targetMessageId.current = null;

    navigate({ search: "" }, { replace: true });

    setTimeout(() => {
      lockScrollBottom.current = false;
    }, 700);
  }, [messages]);

  /* =====================
     RENDER
  ===================== */
  return (
    <div className="chat-view">
      {/* MESSAGES */}
      <div className="chat-messages" ref={scrollbarRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="message-item"
            ref={(el) => {
              if (el) messageRefs.current.set(msg.id, el);
              else messageRefs.current.delete(msg.id);
            }}
          >
            <div className="message-row">
              <Avatar
                size={40}
                src={msg.sender_avatar || defaultAvatar}
              >
                {msg.sender_name?.[0]}
              </Avatar>

              <div className="content-col">
                <div className="message-header">
                  <span className="sender-name">
                    {msg.sender_name}
                    {msg.sender_id === currentUserId && (
                      <span className="you-label"> (Bạn)</span>
                    )}
                  </span>
                  <span className="time">{msg.created_at}</span>
                </div>

                <div
                  className="message-body"
                  dangerouslySetInnerHTML={{
                    __html: parseMentions(msg.content),
                  }}
                />

                {msg.have_file && msg.files?.length > 0 && (
                  <div className="file-grid">
                    {msg.files.map((f) => (
                      <FileCard key={f.id} file={f} size="small" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FILE PREVIEW */}
      {files.length > 0 && (
        <div className="file-preview-list">
          {files.map((f, i) => (
            <div key={i} className="file-preview-item">
              {f.name}
              <span
                className="remove-icon"
                onClick={() =>
                  setFiles((prev) =>
                    prev.filter((_, idx) => idx !== i)
                  )
                }
              >
                ✕
              </span>
            </div>
          ))}
        </div>
      )}

      {/* INPUT */}
      <div className="chat-input">
        <Upload
          multiple
          beforeUpload={() => false}
          showUploadList={false}
          onChange={(info) =>
            setFiles((prev) => [...prev, info.file])
          }
        >
          <Button icon={<PaperClipOutlined />} />
        </Upload>

        <MentionInput
          value={text}
          onChange={setText}
          users={members}
          placeholder="Nhập tin nhắn, nhấn @ để nhắc đến ai đó..."
        />

        <Button
          type="primary"
          loading={sending}
          onClick={sendMessage}
        >
          Gửi
        </Button>
      </div>
    </div>
  );
}