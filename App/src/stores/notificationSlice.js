// src/store/notificationSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import NotificationService from "@/services/Notification.service";
import ChatService from "@/services/Chat.service";

import { getProjectNameById, fetchProjects } from "@/stores/projectSlice";
import { getTaskNameById } from "@/stores/taskSlice";
import { loadTaskById } from "@/stores/taskSlice";

/* =====================
   ASYNC THUNKS
===================== */

// fetchNotifications
export const fetchNotifications = createAsyncThunk(
  "notification/fetchNotifications",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.id) return [];

      const data = await NotificationService.getAllNotifications({
        recipient_id: user.id,
      });

      const notifications = await Promise.all(
        data.map(async (noti) => {
          let title = "Thông báo";

          if (noti.reference_type === "project") {
            title = await dispatch(
              getProjectNameById(noti.reference_id)
            ).unwrap();
          } else if (noti.reference_type === "task") {
            title = await dispatch(
              getTaskNameById(noti.reference_id)
            ).unwrap();
          }

          return { ...noti, title };
        })
      );

      return notifications;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// fetchNewCount
export const fetchNewCount = createAsyncThunk(
  "notification/fetchNewCount",
  async (_, { rejectWithValue }) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.id) return 0;
      return await NotificationService.getNewCount(user.id);
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// addNotification (socket)
export const addNotification = createAsyncThunk(
  "notification/addNotification",
  async (payload, { dispatch }) => {
    let title = "Thông báo";

    if (payload.reference_type === "project") {
      title = await dispatch(
        getProjectNameById(payload.reference_id)
      ).unwrap();
    } else if (payload.reference_type === "task") {
      title = await dispatch(
        getTaskNameById(payload.reference_id)
      ).unwrap();
    }

    dispatch(fetchNewCount());

    return { ...payload, title };
  }
);

// markAllAsUnread
export const markAllAsUnread = createAsyncThunk(
  "notification/markAllAsUnread",
  async (recipient_id, { rejectWithValue }) => {
    try {
      await NotificationService.markAllAsUnread(recipient_id);
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// getReferenceByNoti
export const getReferenceByNoti = createAsyncThunk(
  "notification/getReferenceByNoti",
  async (noti, { getState, dispatch }) => {
    if (!noti?.reference_type || !noti?.reference_id) return null;

    const state = getState();

    if (noti.reference_type === "project") {
      if (!state.project.projects.length) {
        await dispatch(fetchProjects());
      }
      return state.project.projects.find(
        (p) => p.id === noti.reference_id
      );
    }

    if (noti.reference_type === "task") {
      let task = state.task.taskCache?.[noti.reference_id];
      if (!task) {
        task = await dispatch(
          loadTaskById(noti.reference_id)
        ).unwrap();
      }
      return task;
    }

    if (noti.reference_type === "chat_message") {
      const channel = await ChatService.getMessageChannel(
        noti.reference_id
      );
      if (!channel) return null;

      return {
        message_id: noti.reference_id,
        channel_id: channel.id,
        project_id: channel.project_id,
      };
    }

    return null;
  }
);

/* =====================
   SLICE
===================== */

const notificationSlice = createSlice({
  name: "notification",
  initialState: {
    notifications: [],
    newCount: 0,
    loading: false,
    error: null,
  },

  reducers: {
    resetNotification(state) {
      state.notifications = [];
      state.newCount = 0;
      state.loading = false;
    },
  },

  extraReducers: (builder) => {
    builder
      /* fetchNotifications */
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* fetchNewCount */
      .addCase(fetchNewCount.fulfilled, (state, action) => {
        state.newCount = action.payload;
      })

      /* addNotification */
      .addCase(addNotification.fulfilled, (state, action) => {
        state.notifications.unshift(action.payload);
      });
  },
});

/* =====================
   EXPORT
===================== */

export const { resetNotification } = notificationSlice.actions;
export default notificationSlice.reducer;