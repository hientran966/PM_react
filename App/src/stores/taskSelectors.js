export const selectTasksByProject = (state, projectId) =>
  state.task.tasksByProject[projectId] || [];

export const selectFilteredTasksByProject = (state, projectId) => {
  const list = state.task.tasksByProject[projectId] || [];
  const { searchTerm, priorityFilter, assigneeFilter } = state.task;

  return list.filter(t => {
    const matchesSearch =
      !searchTerm ||
      t.title?.toLowerCase().includes(searchTerm);

    const matchesPriority =
      !priorityFilter ||
      (t.priority && t.priority.includes(priorityFilter));

    const matchesAssignee =
      !assigneeFilter ||
      (t.assignees && t.assignees.includes(assigneeFilter));

    return matchesSearch && matchesPriority && matchesAssignee;
  });
};
