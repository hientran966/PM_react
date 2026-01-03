export const selectProjectById = (state, id) =>
  state.project.projects.find(p => p.id === id);

export const selectFilteredProjects = (state) => {
  const { projects, searchTerm, statusFilter } = state.project;

  return projects.filter(p => {
    const matchesSearch =
      !searchTerm || p.name.toLowerCase().includes(searchTerm);

    const matchesStatus =
      !statusFilter || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
};
