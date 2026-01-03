// src/store/inviteSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import MemberService from "@/services/Member.service";
import FileService from "@/services/File.service";
import defaultAvatar from "@/assets/default-avatar.png";
import { message } from "antd";

/* =====================
   ASYNC THUNKS
===================== */

// fetchInvites
export const fetchInvites = createAsyncThunk(
  "invite/fetchInvites",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.id) return [];

      const res = await MemberService.getInviteList(user.id);
      const invites = Array.isArray(res) ? res : [];

      // load avatars sau khi có invites
      await dispatch(loadInviterAvatars(invites));

      return invites;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// loadInviterAvatars
export const loadInviterAvatars = createAsyncThunk(
  "invite/loadInviterAvatars",
  async (invites, { getState }) => {
    const { inviterAvatars } = getState().invite;
    const uniqueIds = [...new Set(invites.map(i => i.invited_by))];

    const result = {};

    await Promise.all(
      uniqueIds.map(async (id) => {
        if (!inviterAvatars[id]) {
          try {
            const res = await FileService.getAvatar(id);
            result[id] = res?.file_url || defaultAvatar;
          } catch {
            result[id] = defaultAvatar;
          }
        }
      })
    );

    return result;
  }
);

// acceptInvite
export const acceptInvite = createAsyncThunk(
  "invite/acceptInvite",
  async (inviteId, { rejectWithValue }) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.id) return inviteId;

      await MemberService.acceptInvite(inviteId, user.id);
      message.success("Đã chấp nhận lời mời!");
      return inviteId;
    } catch (err) {
      message.error("Không thể chấp nhận lời mời");
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// declineInvite
export const declineInvite = createAsyncThunk(
  "invite/declineInvite",
  async (inviteId, { rejectWithValue }) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.id) return inviteId;

      await MemberService.declineInvite(inviteId, user.id);
      message.info("Đã từ chối lời mời");
      return inviteId;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* =====================
   SLICE
===================== */

const inviteSlice = createSlice({
  name: "invite",
  initialState: {
    invites: [],
    loading: false,
    inviterAvatars: {},
    error: null,
  },

  reducers: {},

  extraReducers: (builder) => {
    builder
      /* fetchInvites */
      .addCase(fetchInvites.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInvites.fulfilled, (state, action) => {
        state.loading = false;
        state.invites = action.payload;
      })
      .addCase(fetchInvites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* loadInviterAvatars */
      .addCase(loadInviterAvatars.fulfilled, (state, action) => {
        state.inviterAvatars = {
          ...state.inviterAvatars,
          ...action.payload,
        };
      })

      /* accept / decline */
      .addCase(acceptInvite.fulfilled, (state, action) => {
        state.invites = state.invites.filter(
          (i) => i.id !== action.payload
        );
      })
      .addCase(declineInvite.fulfilled, (state, action) => {
        state.invites = state.invites.filter(
          (i) => i.id !== action.payload
        );
      });
  },
});

export default inviteSlice.reducer;