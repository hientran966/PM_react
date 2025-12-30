import { useEffect, useState } from "react";

import ProjectService from "@/services/Project.service";

import Header from "../components/Header";
import ProjectTable from "../components/ProjectTable";
import ProjectForm from "../components/ProjectForm";

function ProjectsView() {
  const [projects, setProjects] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const onAdd = () => {
    setIsFormOpen(true);
  };

  const onUpdated = async () => {
    const data = await ProjectService.getProjectsByAccountId(1);
    setProjects(data);
  };

  useEffect(() => {
    const fetchProjects = async () => {
      const data = await ProjectService.getProjectsByAccountId(1);
      setProjects(data);
    };

    fetchProjects();
  }, []);

  return (
    <>
      <Header page="project" onAdd={onAdd} />

      <ProjectTable
        className="project-table"
        projects={projects}
        onUpdateProject={onUpdated}
      />

      <ProjectForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onProjectAdded={onUpdated}
      />
    </>
  );
}

export default ProjectsView;