import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import ProjectService from "@/services/Project.service";

/* =====================
   ASYNC THUNKS
===================== */

// fetchProjects
export const fetchProjects = createAsyncThunk(
  "project/fetchProjects",
  async (_, { rejectWithValue }) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.id) return [];

      return await ProjectService.getProjectsByAccountId(user.id);
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// updateProject
export const updateProject = createAsyncThunk(
  "project/updateProject",
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      await ProjectService.updateProject(payload.id, payload);
      dispatch(fetchProjects());
      return payload;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// getNameById
export const getProjectNameById = createAsyncThunk(
  "project/getNameById",
  async (id, { dispatch, getState }) => {
    await dispatch(fetchProjects());

    const project = getState().project.projects.find(p => p.id === id);

    return project
      ? `Project#${project.id} - ${project.name}`
      : "Dự án không xác định";
  }
);

/* =====================
   SLICE
===================== */

const projectSlice = createSlice({
  name: "project",
  initialState: {
    projects: [],
    loading: false,
    searchTerm: "",
    statusFilter: null,
    dateRange: null,
    error: null,
  },

  reducers: {
    addProject(state, action) {
      state.projects.push(action.payload);
    },

    setSearch(state, action) {
      state.searchTerm = action.payload.toLowerCase();
    },

    setStatusFilter(state, action) {
      state.statusFilter = action.payload;
    },

    setDateRange(state, action) {
      state.dateRange = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder
      /* fetchProjects */
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload.map(p => ({ ...p }));
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

/* =====================
   EXPORT
===================== */

export const {
  addProject,
  setSearch,
  setStatusFilter,
  setDateRange,
} = projectSlice.actions;

export default projectSlice.reducer;
