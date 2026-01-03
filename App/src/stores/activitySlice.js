import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import dayjs from "dayjs";
import ActivityService from "@/services/Activity.service";

/* =====================
   THUNKS
===================== */

// loadActivity(taskId)
export const loadActivity = createAsyncThunk(
  "activity/loadActivity",
  async (taskId, { rejectWithValue }) => {
    try {
      const res = await ActivityService.getAllActivity({ task_id: taskId });
      return {
        taskId,
        data: (res || []).map((c) => ({
          ...c,
          created_at: dayjs(c.created_at).format("DD/MM/YYYY HH:mm"),
        })),
      };
    } catch (err) {
      console.error("Lỗi load log:", err);
      return rejectWithValue(err);
    }
  }
);

// addActivity({ taskId, payload })
export const addActivity = createAsyncThunk(
  "activity/addActivity",
  async ({ taskId, payload }, { rejectWithValue }) => {
    try {
      const res = await ActivityService.createActivity(payload);
      return {
        taskId,
        data: {
          ...res,
          created_at: dayjs(res.created_at).format("DD/MM/YYYY HH:mm"),
        },
      };
    } catch (err) {
      return rejectWithValue(err);
    }
  }
);

/* =====================
   SLICE
===================== */

const activitySlice = createSlice({
  name: "activity",
  initialState: {
    activitysByTask: {},
    loading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder

      /* LOAD */
      .addCase(loadActivity.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadActivity.fulfilled, (state, action) => {
        const { taskId, data } = action.payload;
        state.activitysByTask[taskId] = data;
        state.loading = false;
      })
      .addCase(loadActivity.rejected, (state) => {
        state.loading = false;
      })

      /* ADD */
      .addCase(addActivity.fulfilled, (state, action) => {
        const { taskId, data } = action.payload;
        if (!state.activitysByTask[taskId]) {
          state.activitysByTask[taskId] = [];
        }
        state.activitysByTask[taskId].unshift(data);
      });
  },
});

export default activitySlice.reducer;
