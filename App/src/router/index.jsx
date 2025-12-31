import { createBrowserRouter, redirect } from "react-router-dom";
import App from "../App";

import Home from "../pages/Home";
import ProjectsView from "../pages/ProjectsView";
import TaskLayout from "../pages/TaskLayout";
//import NotFound from "../pages/NotFound";

/* =========================
   AUTH GUARD
========================= */
const authGuard = ({ request }) => {
  const token = localStorage.getItem("token");
  const url = new URL(request.url);

  if (!token && url.pathname !== "/") {
    throw redirect("/");
  }

  if (url.pathname === "/forbidden" && !url.searchParams.get("code")) {
    throw redirect("/not-found");
  }

  return null;
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    loader: authGuard,
    children: [
      { index: true, element: <Home /> },

      {
        path: "projects",
        element: <ProjectsView />,
      }, 

      {
        path: "projects/:id",
        element: <TaskLayout />,
      },

      {
        path: "forbidden",
        element: <ProjectsView />,
        handle: { layout: "empty", forbidden: true },
      },

      {
        path: "*",
        element: <ProjectsView />,
        handle: { layout: "empty" },
      },
    ],
  },
]);