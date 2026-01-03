import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import FileService from "@/services/File.service";

/* =====================
   ASYNC THUNKS
===================== */

// loadFiles(taskId)
export const loadFiles = createAsyncThunk(
  "file/loadFiles",
  async (taskId, { getState, rejectWithValue }) => {
    try {
      const res = await FileService.getAllFiles({ task_id: taskId });
      const { fileVersions } = getState().file;

      return {
        taskId,
        files: (res || []).map(f => ({
          ...f,
          versions: fileVersions[f.id] || [],
        })),
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// loadFilesByProject(projectId)
export const loadFilesByProject = createAsyncThunk(
  "file/loadFilesByProject",
  async (projectId, { getState, rejectWithValue }) => {
    try {
      const res = await FileService.getAllFiles({ project_id: projectId });
      const { fileVersions } = getState().file;

      return {
        projectId,
        files: (res || []).map(f => ({
          ...f,
          versions: fileVersions[f.id] || [],
        })),
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// loadFilesByUser(projectId, userId)
export const loadFilesByUser = createAsyncThunk(
  "file/loadFilesByUser",
  async ({ projectId, userId }, { getState, rejectWithValue }) => {
    try {
      const res = await FileService.getAllFiles({
        project_id: projectId,
        created_by: userId,
      });

      const { fileVersions } = getState().file;
      const key = `${projectId}_${userId}`;

      return {
        key,
        files: (res || []).map(f => ({
          ...f,
          versions: fileVersions[f.id] || [],
        })),
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// loadFileVersions(fileId)
export const loadFileVersions = createAsyncThunk(
  "file/loadFileVersions",
  async (fileId, { rejectWithValue }) => {
    try {
      const versions = await FileService.getFileVersion(fileId);
      return { fileId, versions: versions || [] };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* =====================
   SLICE
===================== */

const fileSlice = createSlice({
  name: "file",
  initialState: {
    filesByTask: {},
    filesByProject: {},
    filesByUserInProject: {},
    fileVersions: {},
    loading: false,
    error: null,
  },

  reducers: {
    addFile(state, action) {
      const { taskId, file } = action.payload;
      state.filesByTask[taskId] ||= [];
      state.filesByTask[taskId].push({
        ...file,
        versions: state.fileVersions[file.id] || [],
      });
    },
  },

  extraReducers: (builder) => {
    builder
      /* loadFiles */
      .addCase(loadFiles.fulfilled, (state, action) => {
        state.filesByTask[action.payload.taskId] = action.payload.files;
      })

      /* loadFilesByProject */
      .addCase(loadFilesByProject.fulfilled, (state, action) => {
        state.filesByProject[action.payload.projectId] = action.payload.files;
      })

      /* loadFilesByUser */
      .addCase(loadFilesByUser.fulfilled, (state, action) => {
        state.filesByUserInProject[action.payload.key] =
          action.payload.files;
      })

      /* loadFileVersions */
      .addCase(loadFileVersions.fulfilled, (state, action) => {
        const { fileId, versions } = action.payload;
        state.fileVersions[fileId] = versions;

        const patch = (list = []) =>
          list.map(f =>
            f.id === fileId ? { ...f, versions } : f
          );

        Object.keys(state.filesByTask).forEach(
          k => (state.filesByTask[k] = patch(state.filesByTask[k]))
        );

        Object.keys(state.filesByProject).forEach(
          k => (state.filesByProject[k] = patch(state.filesByProject[k]))
        );

        Object.keys(state.filesByUserInProject).forEach(
          k => (state.filesByUserInProject[k] = patch(state.filesByUserInProject[k]))
        );
      });
  },
});

export const { addFile } = fileSlice.actions;
export default fileSlice.reducer;
