import { useEffect, useState } from "react";
import { Button, Input, Divider } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";

import '@/assets/css/Header.css'

const Header = ({ page = "project", onAdd }) => {
  /* =====================
     STORE
  ===================== */

  /* =====================
     STATE
  ===================== */
  const [search, setSearchValue] = useState("");

  /* =====================
     EFFECT (watch search)
  ===================== */

  /* =====================
     TITLE
  ===================== */
  const pageTitle =
    page === "project" ? "Danh sách Project" : "Danh sách";

  /* =====================
     RENDER
  ===================== */
  return (
    <div style={{ padding: "16px 24px", backgroundColor: "white" }}>
      {/* ===== TITLE ===== */}
      <div
        style={{
          height: 40,
          display: "flex",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0, color: "black" }}>{pageTitle}</h3>
      </div>

      <Divider style={{ margin: "12px 0" }} />

      {/* ===== TOOLBAR ===== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* LEFT */}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onAdd}
        >
          Thêm mới
        </Button>

        {/* RIGHT */}
        <Input
          placeholder="Tìm kiếm..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearchValue(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
      </div>
    </div>
  );
};

export default Header;