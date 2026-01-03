// src/store/taskSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import TaskService from "@/services/Task.service";
import AssignService from "@/services/Assign.service";

/* =====================
   ASYNC THUNKS
===================== */

// loadTasks(projectId)
export const loadTasks = createAsyncThunk(
  "task/loadTasks",
  async (projectId, { rejectWithValue }) => {
    try {
      if (!projectId) return { projectId, tasks: [] };
      const tasks = await TaskService.getByProject(projectId);
      return { projectId, tasks: tasks || [] };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// loadTaskById(taskId)
export const loadTaskById = createAsyncThunk(
  "task/loadTaskById",
  async (taskId, { getState, rejectWithValue }) => {
    const { taskCache } = getState().task;
    if (taskCache[taskId]) return taskCache[taskId];

    try {
      return await TaskService.getTaskById(taskId);
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// updateTask
export const updateTask = createAsyncThunk(
  "task/updateTask",
  async ({ projectId, updatedTask }, { rejectWithValue }) => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      // === progress ===
      if (updatedTask.changedField === "progress") {
        const payload = {
          loggedBy: user.id,
          progress_value: updatedTask.latest_progress ?? 0,
        };
        await TaskService.progressLog(updatedTask.id, payload);
      }

      // === assignee ===
      else if (updatedTask.changedField === "assignee") {
        await TaskService.deleteAssign(updatedTask.id, user.id);
        for (const userId of updatedTask.assignees || []) {
          await AssignService.createAssign({
            task_id: updatedTask.id,
            user_id: userId,
            actor_id: user.id,
            project_id: projectId,
          });
        }
      }

      // === default ===
      else {
        await TaskService.updateTask(updatedTask.id, updatedTask);
      }

      return { projectId, updatedTask };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// updateStatus
export const updateStatus = createAsyncThunk(
  "task/updateStatus",
  async ({ projectId, task }, { rejectWithValue }) => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await TaskService.updateTask(task.id, {
        status: task.status,
        project_id: projectId,
        changedField: "status",
        updated_by: user.id,
      });
      return { projectId, task };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// deleteTask
export const deleteTask = createAsyncThunk(
  "task/deleteTask",
  async (taskId, { rejectWithValue }) => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await TaskService.deleteTask(taskId, user.id);
      return taskId;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// getNameById
export const getTaskNameById = createAsyncThunk(
  "task/getNameById",
  async (id, { getState }) => {
    const { taskCache } = getState().task;
    if (taskCache[id])
      return taskCache[id].title || "Không có tiêu đề";

    const task = await TaskService.getTaskById(id);
    return task
      ? `Task#${task.id} - ${task.title || "Không có tiêu đề"}`
      : "Công việc";
  }
);

/* =====================
   SLICE
===================== */

const taskSlice = createSlice({
  name: "task",
  initialState: {
    tasksByProject: {},
    taskCache: {},
    loading: false,
    searchTerm: "",
    priorityFilter: null,
    assigneeFilter: null,
    error: null,
  },

  reducers: {
    addTask(state, action) {
      const { projectId, task } = action.payload;
      state.tasksByProject[projectId] ||= [];
      state.tasksByProject[projectId].push(task);
      state.taskCache[task.id] = task;
    },

    setSearch(state, action) {
      state.searchTerm = action.payload.toLowerCase();
    },
    setPriorityFilter(state, action) {
      state.priorityFilter = action.payload;
    },
    setAssigneeFilter(state, action) {
      state.assigneeFilter = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loadTasks.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadTasks.fulfilled, (state, action) => {
        const { projectId, tasks } = action.payload;
        state.loading = false;
        state.tasksByProject[projectId] = tasks;
        tasks.forEach(t => (state.taskCache[t.id] = t));
      })
      .addCase(loadTaskById.fulfilled, (state, action) => {
        const task = action.payload;
        if (!task) return;
        state.taskCache[task.id] = task;
        state.tasksByProject[task.project_id] ||= [];
        if (!state.tasksByProject[task.project_id].some(t => t.id === task.id)) {
          state.tasksByProject[task.project_id].push(task);
        }
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const { projectId, updatedTask } = action.payload;
        const list = state.tasksByProject[projectId] || [];
        const idx = list.findIndex(t => t.id === updatedTask.id);
        if (idx !== -1) list[idx] = { ...list[idx], ...updatedTask };
        else list.push(updatedTask);
        state.taskCache[updatedTask.id] = {
          ...state.taskCache[updatedTask.id],
          ...updatedTask,
        };
      })
      .addCase(updateStatus.fulfilled, (state, action) => {
        const { projectId, task } = action.payload;
        const list = state.tasksByProject[projectId] || [];
        const idx = list.findIndex(t => t.id === task.id);
        if (idx !== -1) list[idx].status = task.status;
      });
  },
});

export const {
  addTask,
  setSearch,
  setPriorityFilter,
  setAssigneeFilter,
} = taskSlice.actions;

export default taskSlice.reducer;