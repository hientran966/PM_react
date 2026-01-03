// selectors/activitySelectors.js
export const selectActivityByTask =
  (taskId) =>
  (state) =>
    state.activity.activitysByTask[taskId] || [];