export const selectCommentsByTask = (state, taskId) =>
  state.comment.commentsByTask[taskId] || [];