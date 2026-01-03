export const selectFilesByTask = (state, taskId) =>
  state.file.filesByTask[taskId] || [];

export const selectFilesByProject = (state, projectId) =>
  state.file.filesByProject[projectId] || [];

export const selectFilesByUser = (state, projectId, userId) =>
  state.file.filesByUserInProject[`${projectId}_${userId}`] || [];

export const selectFileVersions = (state, fileId) =>
  state.file.fileVersions[fileId] || [];
