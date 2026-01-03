import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import CommentService from "@/services/Comment.service";
import dayjs from "dayjs";

/* =====================
   ASYNC THUNKS
===================== */

// loadComments(taskId)
export const loadComments = createAsyncThunk(
  "comment/loadComments",
  async (taskId, { rejectWithValue }) => {
    try {
      const res = await CommentService.getAllComments({ task_id: taskId });

      return {
        taskId,
        comments: (res || []).map(c => ({
          ...c,
          created_at: dayjs(c.created_at).format("DD/MM/YYYY HH:mm"),
        })),
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// addComment(taskId, payload)
export const addComment = createAsyncThunk(
  "comment/addComment",
  async ({ taskId, payload }, { rejectWithValue }) => {
    try {
      const res = await CommentService.createComment(payload);

      return {
        taskId,
        comment: {
          ...res,
          created_at: dayjs(res.created_at).format("DD/MM/YYYY HH:mm"),
        },
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* =====================
   SLICE
===================== */

const commentSlice = createSlice({
  name: "comment",
  initialState: {
    commentsByTask: {},
    commentsByVersion: {},
    loading: false,
    error: null,
  },

  reducers: {},

  extraReducers: (builder) => {
    builder
      /* loadComments */
      .addCase(loadComments.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadComments.fulfilled, (state, action) => {
        state.loading = false;
        state.commentsByTask[action.payload.taskId] =
          action.payload.comments;
      })
      .addCase(loadComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* addComment */
      .addCase(addComment.fulfilled, (state, action) => {
        const { taskId, comment } = action.payload;
        state.commentsByTask[taskId] ||= [];
        state.commentsByTask[taskId].unshift(comment);
      });
  },
});

export default commentSlice.reducer;