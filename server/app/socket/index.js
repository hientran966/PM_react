const { Server } = require("socket.io");
const MySQL = require("../utils/mysql.util");

let io;
const onlineUsers = new Map();

function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("register", (userId) => {
            onlineUsers.set(userId, socket.id);
            socket.userId = userId;
            console.log(`User ${userId} online`);
        });

        socket.on("join_channel", (channelId) => {
            socket.join(`channel_${channelId}`);
        });

        socket.on("leave_channel", (channelId) => {
            socket.leave(`channel_${channelId}`);
        });

        socket.on("chat_message", (data) => {
            if (!data) return;
            const { channel_id } = data;

            if (!channel_id) {
                console.error("Missing channel_id in chat_message payload:", data);
                return;
            }

            io.to(`channel_${channel_id}`).emit("chat_message", data);
        });

        socket.on("disconnect", () => {
            for (const [uid, sid] of onlineUsers.entries()) {
                if (sid === socket.id) {
                    onlineUsers.delete(uid);
                    console.log(`User ${uid} disconnected`);
                    break;
                }
            }
        });
    });
}

function sendToUser(userId, event, payload) {
    if (!io) return;
    const socketId = onlineUsers.get(userId);
    if (socketId) {
        io.to(socketId).emit(event, payload);
    }
}

function broadcast(type, payload) {
    if (io) io.emit("notification", { type, payload });
}

function sendMessageToChannel(channelId, message) {
    if (io) io.to(`channel_${channelId}`).emit("chat_message", message);
}

async function sendToProject(projectId, event, payload) {
    if (!io) return;
    const [rows] = await MySQL.pool.execute(
        `SELECT user_id FROM project_members WHERE project_id = ? AND deleted_at IS NULL`,
        [projectId]
    );

    for (const r of rows) {
        const socketId = onlineUsers.get(r.user_id);
        if (socketId) {
            io.to(socketId).emit(event, payload);
        }
    }
}

async function sendGitPushToProject(projectId, payload) {
    return sendToProject(projectId, "git_push", payload);
}

async function sendGitCommitToProject(projectId, payload) {
    return sendToProject(projectId, "git_commit", payload);
}

async function sendGitEventToProject(projectId, payload) {
    return sendToProject(projectId, "git_event", payload);
}

module.exports = initSocket;
module.exports.sendToUser = sendToUser;
module.exports.broadcast = broadcast;
module.exports.sendMessageToChannel = sendMessageToChannel;
module.exports.sendToProject = sendToProject;
module.exports.sendGitPushToProject = sendGitPushToProject;
module.exports.sendGitCommitToProject = sendGitCommitToProject;
module.exports.sendGitEventToProject = sendGitEventToProject;