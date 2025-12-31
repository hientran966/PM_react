import { io } from "socket.io-client";

let socket;

export function initSocket(userId) {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL || "http://localhost:3000", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Connected to WebSocket:", socket.id);
      if (userId) socket.emit("register", userId);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from WebSocket");
    });
  }

  return socket;
}

export function getSocket() {
  if (!socket) {
    console.warn("Socket chưa được khởi tạo. Gọi initSocket(userId) trước.");
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    console.log("Socket disconnected");
    socket = null;
  }
}