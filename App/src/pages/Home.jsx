import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Row,
  Col,
  Card,
  Table,
  Pagination,
  Avatar,
  Button,
  Upload,
  Empty,
  message,
  Divider,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";

import { fetchProjects } from "@/stores/projectSlice";
import {
  fetchInvites,
  acceptInvite,
  declineInvite,
} from "@/stores/inviteSlice";

import AccountService from "@/services/Account.service";
import FileService from "@/services/File.service";

import ProfileModal from "@/components/ProfileModal";
import defaultAvatar from "@/assets/default-avatar.png";
import "@/assets/css/Home.css";

const PAGE_SIZE = 7;

export default function MeDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  /* ================== STORE ================== */
  const { projects, loading } = useSelector((state) => state.project);
  const invites = useSelector((state) => state.invite.invites);

  /* ================== LOCAL UI STATE ================== */
  const [user, setUser] = useState({});
  const [avatar, setAvatar] = useState("");
  const [hovering, setHovering] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  /* ================== UTILS ================== */
  const formatDate = (date) =>
    date ? dayjs(date).format("DD/MM/YYYY") : "";

  /* ================== PROJECTS ================== */
  const ongoingProjects = useMemo(
    () => projects.filter((p) => p.status === "Đang tiến hành"),
    [projects]
  );

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return ongoingProjects.slice(start, start + PAGE_SIZE);
  }, [ongoingProjects, currentPage]);

  /* ================== TABLE ================== */
  const columns = [
    { title: "Tên dự án", dataIndex: "name" },
    {
      title: "Bắt đầu",
      dataIndex: "start_date",
      render: formatDate,
      width: 120,
    },
    {
      title: "Kết thúc",
      dataIndex: "end_date",
      render: formatDate,
      width: 120,
    },
  ];

  /* ================== AVATAR UPLOAD ================== */
  const beforeUpload = (file) => {
    if (!file.type.startsWith("image/")) {
      message.error("Chỉ được chọn file ảnh!");
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const handleUpload = async ({ file }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await FileService.uploadAvatar(user.id, formData);
      if (res?.result?.file_url) {
        const updated = await FileService.getAvatar(user.id);
        setAvatar(`${updated?.file_url}?v=${Date.now()}`);
        message.success("Cập nhật ảnh đại diện thành công!");
      }
    } catch {
      message.error("Tải ảnh lên thất bại!");
    }
  };

  /* ================== INVITE ACTIONS ================== */
  const handleAcceptInvite = (id) => {
    dispatch(acceptInvite(id))
      .unwrap()
      .then(() => message.success("Đã chấp nhận lời mời"));
  };

  const handleRejectInvite = (id) => {
    dispatch(declineInvite(id))
      .unwrap()
      .then(() => message.info("Đã từ chối lời mời"));
  };

  /* ================== LOAD DATA ================== */
  const loadUser = async () => {
    try {
      const userData = await AccountService.getCurrentUser();
      setUser(userData);

      if (userData?.id) {
        try {
          const avatarData = await FileService.getAvatar(userData.id);
          setAvatar(avatarData?.file_url || "");
        } catch {
          setAvatar("");
        }

        dispatch(fetchProjects());
        dispatch(fetchInvites());
      }

      setUserLoaded(true);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUser();
  }, []);

  /* ================== CALLBACK ================== */
  const handleUserSaved = async () => {
    await loadUser();
    message.success("Thông tin người dùng đã được cập nhật!");
  };

  /* ================== RENDER ================== */
  return (
    <div className="me-background">
      <div className="dashboard-container">
        {/* HEADER */}
        <div className="me-header-overlay">
          <div
            className="avatar-wrapper"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            <Upload
              showUploadList={false}
              beforeUpload={beforeUpload}
              customRequest={handleUpload}
            >
              <Avatar
                size={64}
                src={avatar || defaultAvatar}
                className="me-avatar"
              />
              {hovering && (
                <div className="upload-overlay">
                  <UploadOutlined />
                  <span>Upload</span>
                </div>
              )}
            </Upload>
          </div>

          <h2>Xin chào, {user.name}!</h2>

          <Button
            type="primary"
            size="small"
            style={{ marginLeft: "auto" }}
            onClick={() => setEditVisible(true)}
          >
            Chỉnh sửa thông tin
          </Button>
        </div>

        <Row gutter={16} style={{ marginTop: 20 }}>
          {/* PROJECTS */}
          <Col xs={24} lg={16}>
            <Card title="Projects hiện tại" hoverable>
              <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={paginatedProjects}
                pagination={false}
                scroll={{ y: 341 }}
                onRow={(record) => ({
                  onClick: () => navigate(`/tasks/${record.id}`),
                })}
              />

              <Pagination
                style={{ marginTop: 10, textAlign: "right" }}
                total={ongoingProjects.length}
                pageSize={PAGE_SIZE}
                current={currentPage}
                onChange={setCurrentPage}
              />
            </Card>
          </Col>

          {/* INVITES */}
          <Col xs={24} lg={8}>
            <Card title="Lời mời" hoverable>
              {!invites.length ? (
                <Empty description="Không có lời mời nào" />
              ) : (
                invites.map((item) => (
                  <div key={item.id} className="invite-item">
                    <div className="invite-header">
                      <Avatar src={item.inviterAvatar || defaultAvatar} />
                      <div>
                        <strong>{item.invited_by_name}</strong> mời bạn tham gia
                        <strong> {item.project_name}</strong>
                        <div className="invite-date">
                          {formatDate(item.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="invite-actions">
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => handleAcceptInvite(item.id)}
                      >
                        Chấp nhận
                      </Button>
                      <Button
                        size="small"
                        danger
                        onClick={() => handleRejectInvite(item.id)}
                      >
                        Từ chối
                      </Button>
                    </div>

                    <Divider />
                  </div>
                ))
              )}
            </Card>
          </Col>
        </Row>

        {/* PROFILE MODAL */}
        {userLoaded && (
          <ProfileModal
            open={editVisible}
            onClose={setEditVisible}
            user={user}
            onSaved={handleUserSaved}
          />
        )}
      </div>
    </div>
  );
}