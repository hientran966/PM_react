import { useState, useEffect } from 'react'
import { Outlet } from "react-router-dom";
import '@/assets/css/App.css'

import SideBar from "@/components/SideBar";

function App() {
  return (
    <>
      <div className="common-layout">
        <div className="sidebar">
          <SideBar unreadCount="1" />
        </div>
        <div className="main-content">
          <Outlet />
        </div>
      </div>
    </>
  )
}

export default App