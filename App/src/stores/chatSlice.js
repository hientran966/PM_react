import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import ChatService from "@/services/Chat.service";
import dayjs from "dayjs";

/* =====================
   ASYNC THUNKS
===================== */

/* ===== MESSAGES ===== */

// loadChats
export const loadChats = createAsyncThunk(
  "chat/loadChats",
  async (channelId, { rejectWithValue }) => {
    try {
      const res = await ChatService.getChannelMessages(channelId);
      return {
        channelId,
        chats: (res || []).map((c) => ({
          ...c,
          created_at: dayjs(c.created_at).format("DD/MM/YYYY HH:mm"),
        })),
      };
    } catch (err) {
      return rejectWithValue({ channelId, error: err.message });
    }
  }
);

/* ===== CHANNEL ===== */

// getChannelDetail
export const getChannelDetail = createAsyncThunk(
  "chat/getChannelDetail",
  async (channelId, { getState }) => {
    const cached = getState().chat.channels.find(
      (c) => c.id === channelId
    );
    if (cached) return cached;

    return await ChatService.getChannelById(channelId);
  }
);

// loadChannelByUser
export const loadChannelByUser = createAsyncThunk(
  "chat/loadChannelByUser",
  async ({ projectId, userId }) => {
    return await ChatService.getChannelsByUser(projectId, userId);
  }
);

// loadChannelsByProject
export const loadChannelsByProject = createAsyncThunk(
  "chat/loadChannelsByProject",
  async (projectId) => {
    return await ChatService.getChannelsByProject(projectId);
  }
);

// createChannel
export const createChannel = createAsyncThunk(
  "chat/createChannel",
  async (payload) => {
    return await ChatService.createChannel(payload);
  }
);

// updateChannel
export const updateChannel = createAsyncThunk(
  "chat/updateChannel",
  async ({ channelId, payload }) => {
    return await ChatService.updateChannel(channelId, payload);
  }
);

// deleteChannel
export const deleteChannel = createAsyncThunk(
  "chat/deleteChannel",
  async (channelId) => {
    await ChatService.deleteChannel(channelId);
    return channelId;
  }
);

/* ===== MEMBERS ===== */

export const getChannelMembers = createAsyncThunk(
  "chat/getChannelMembers",
  async (channelId) => {
    const members = await ChatService.getChannelMembers(channelId);
    return { channelId, members };
  }
);

export const addChannelMember = createAsyncThunk(
  "chat/addChannelMember",
  async ({ channelId, userId }) => {
    const updated = await ChatService.addMember({
      channel_id: channelId,
      user_id: userId,
    });
    return updated;
  }
);

export const removeChannelMember = createAsyncThunk(
  "chat/removeChannelMember",
  async ({ channelId, userId }) => {
    const updated = await ChatService.removeMember({
      channel_id: channelId,
      user_id: userId,
    });
    return updated;
  }
);

/* =====================
   SLICE
===================== */

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    chatByChannel: {},
    membersByChannel: {},
    channels: [],
  },

  reducers: {
    /* ===== appendChat (socket) ===== */
    appendChat(state, action) {
      const { channelId, chat } = action.payload;

      if (!state.chatByChannel[channelId]) {
        state.chatByChannel[channelId] = [];
      }

      state.chatByChannel[channelId].push({
        ...chat,
        created_at: dayjs(chat.created_at).format("DD/MM/YYYY HH:mm"),
      });
    },
  },

  extraReducers: (builder) => {
    builder
      /* ===== loadChats ===== */
      .addCase(loadChats.fulfilled, (state, action) => {
        state.chatByChannel[action.payload.channelId] =
          action.payload.chats;
      })
      .addCase(loadChats.rejected, (state, action) => {
        if (action.payload?.channelId) {
          state.chatByChannel[action.payload.channelId] = [];
        }
      })

      /* ===== CHANNEL ===== */
      .addCase(getChannelDetail.fulfilled, (state, action) => {
        const exists = state.channels.some(
          (c) => c.id === action.payload.id
        );
        if (!exists) {
          state.channels.push(action.payload);
        }
      })
      .addCase(loadChannelByUser.fulfilled, (state, action) => {
        state.channels = action.payload || [];
      })
      .addCase(loadChannelsByProject.fulfilled, (state, action) => {
        state.channels = action.payload || [];
      })
      .addCase(createChannel.fulfilled, (state, action) => {
        state.channels.push(action.payload);
      })
      .addCase(updateChannel.fulfilled, (state, action) => {
        const idx = state.channels.findIndex(
          (c) => c.id === action.payload.id
        );
        if (idx !== -1) {
          state.channels[idx] = action.payload;
        }
      })
      .addCase(deleteChannel.fulfilled, (state, action) => {
        state.channels = state.channels.filter(
          (c) => c.id !== action.payload
        );
        delete state.chatByChannel[action.payload];
      })

      /* ===== MEMBERS ===== */
      .addCase(getChannelMembers.fulfilled, (state, action) => {
        state.membersByChannel[action.payload.channelId] =
          action.payload.members;
      })
      .addCase(addChannelMember.fulfilled, (state, action) => {
        const idx = state.channels.findIndex(
          (c) => c.id === action.payload.id
        );
        if (idx !== -1) {
          state.channels[idx] = action.payload;
        }
      })
      .addCase(removeChannelMember.fulfilled, (state, action) => {
        const idx = state.channels.findIndex(
          (c) => c.id === action.payload.id
        );
        if (idx !== -1) {
          state.channels[idx] = action.payload;
        }
      });
  },
});

/* =====================
   EXPORT
===================== */

export const { appendChat } = chatSlice.actions;

export default chatSlice.reducer;
