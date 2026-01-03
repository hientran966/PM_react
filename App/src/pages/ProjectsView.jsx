import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Header from "@/components/Header";
import ProjectTable from "@/components/ProjectTable";
import ProjectForm from "@/components/ProjectForm";

import {
  fetchProjects,
  updateProject,
} from "@/stores/projectSlice";

import { selectFilteredProjects } from "@/stores/projectSelectors";

import "@/assets/css/Projects.css";

function ProjectsView() {
  const dispatch = useDispatch();

  /* =======================
     STORE
  ======================= */
  const projects = useSelector(selectFilteredProjects);
  const loading = useSelector((state) => state.project.loading);

  /* =======================
     UI STATE
  ======================= */
  const [isFormOpen, setIsFormOpen] = useState(false);

  /* =======================
     HANDLERS
  ======================= */
  const onAdd = () => setIsFormOpen(true);

  const onUpdateProject = (payload) => {
    dispatch(updateProject(payload));
  };

  const onProjectAdded = () => {
    dispatch(fetchProjects());
    setIsFormOpen(false);
  };

  /* =======================
     LIFECYCLE
  ======================= */
  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  /* =======================
     RENDER
  ======================= */
  return (
    <>
      <Header page="project" onAdd={onAdd} />

      <ProjectTable
        className="project-table"
        loading={loading}
        projects={projects}
        onUpdateProject={onUpdateProject}
      />

      <ProjectForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onProjectAdded={onProjectAdded}
      />
    </>
  );
}

export default ProjectsView;