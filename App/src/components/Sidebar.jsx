import React from "react";
import { Menu, Badge } from "antd";
import {
  HomeOutlined,
  FolderOutlined,
  BellOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
//import { useNotificationStore } from "@/stores/notificationStore";
//import { disconnectSocket } from "@/plugins/socket";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
  },
  menu: {
    flex: 1,
  },
  logout: {
    marginTop: "auto",
  },
};

const Sidebar = ({ unreadCount = 0 }) => {
  const location = useLocation();
  const navigate = useNavigate();
  //const notiStore = useNotificationStore();

  const handleMenuSelect = async ({ key }) => {
    if (key === "/notifications") {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user?.id) {
          //await notiStore.markAllAsUnread(user.id);
          //await notiStore.fetchNewCount();
        }
      } catch (err) {
        console.error("Lỗi khi markAsUnread:", err);
      }
    }

    navigate(key);
  };

  const onLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    //disconnectSocket();
    window.dispatchEvent(new Event("auth-changed"));
    //navigate("/"); 
  };

  return (
    <div style={styles.container}>
      <Menu
        mode="inline"
        theme="dark"
        inlineCollapsed
        selectedKeys={[location.pathname]}
        onClick={handleMenuSelect}
        style={styles.menu}
        items={[
          {
            key: "/",
            icon: <HomeOutlined />,
            label: "Home",
          },
          {
            key: "/projects",
            icon: <FolderOutlined />,
            label: "Dự án",
          },
          {
            key: "/notifications",
            icon: (
              <Badge count={unreadCount} size="small" offset={[6, 0]}>
                <BellOutlined />
              </Badge>
            ),
            label: "Thông báo",
          },
        ]}
      />

      <div style={styles.logout}>
        <Menu
          mode="inline"
          theme="dark"
          inlineCollapsed
          onClick={onLogout}
          items={[
            {
              key: "logout",
              icon: <LogoutOutlined />,
              label: "Đăng xuất",
            },
          ]}
        />
      </div>
    </div>
  );
};

export default Sidebar;
