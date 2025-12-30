import { useState } from "react";
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Table,
  Avatar,
  message,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import ProjectService from "@/services/Project.service";
import AccountService from "@/services/Account.service";
import FileService from "@/services/File.service";

import defaultAvatar from "@/assets/default-avatar.png";

const { TextArea } = Input;

const ProjectForm = ({ open, onClose, onProjectAdded }) => {
  /* ================= FORM ================= */
  const [form] = Form.useForm();

  /* ================= STATE ================= */
  const [members, setMembers] = useState([]);
  const [newMember, setNewMember] = useState({
    email: "",
    role: "member",
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [userFound, setUserFound] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatar);

  /* ================= HELPERS ================= */
  const toSQLDate = (date) =>
    date ? dayjs(date).format("YYYY-MM-DD") : null;

  /* ================= MEMBER LOGIC ================= */
  const addMember = async () => {
    if (!newMember.email) {
      return message.warning("Vui lòng nhập email");
    }

    try {
      const users = await AccountService.findByEmail(newMember.email);
      const user = Array.isArray(users) ? users[0] : users;
      const currentUser = await AccountService.getCurrentUser();

      if (!user) {
        return message.error("Email không tồn tại");
      }

      if (user.id === currentUser.id) {
        return message.warning("Không thể thêm chính mình");
      }

      if (members.some((m) => m.user_id === user.id)) {
        return message.warning("Thành viên đã tồn tại");
      }

      setUserFound(user);
      await loadAvatar(user.id);
      setConfirmOpen(true);
    } catch {
      message.error("Không thể kiểm tra email");
    }
  };

  const confirmAddMember = () => {
    setMembers((prev) => [
      ...prev,
      {
        user_id: userFound.id,
        email: userFound.email,
        role: newMember.role,
      },
    ]);

    message.success(`Đã thêm ${userFound.email}`);
    setConfirmOpen(false);
    setUserFound(null);
    setNewMember({ email: "", role: "member" });
  };

  const loadAvatar = async (userId) => {
    try {
      const res = await FileService.getAvatar(userId);
      setAvatarUrl(res?.file_url || defaultAvatar);
    } catch {
      setAvatarUrl(defaultAvatar);
    }
  };

  const removeMember = (index) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  /* ================= SUBMIT ================= */
  const submit = async () => {
    try {
      const values = await form.validateFields();
      const user = JSON.parse(localStorage.getItem("user"));

      const payload = {
        ...values,
        start_date: toSQLDate(values.start_date),
        end_date: toSQLDate(values.end_date),
        created_by: user.id,
        members: members.map((m) => ({
          user_id: m.user_id,
          role: m.role,
        })),
      };

      await ProjectService.createProject(payload);

      message.success("Tạo dự án thành công");
      form.resetFields();
      setMembers([]);
      onClose();
      onProjectAdded?.();
    } catch {
      message.error("Lỗi tạo dự án");
    }
  };

  /* ================= TABLE ================= */
  const columns = [
    { title: "Email", dataIndex: "email" },
    { title: "Vai trò", dataIndex: "role" },
    {
      title: "Hành động",
      render: (_, __, index) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeMember(index)}
        />
      ),
      width: 80,
    },
  ];

  return (
    <>
      {/* ===== MAIN MODAL ===== */}
      <Modal
        open={open}
        title="Thêm Dự Án Mới"
        width={600}
        onCancel={onClose}
        onOk={submit}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          initialValues={{ status: "Lên kế hoạch" }}
        >
          <Form.Item
            label="Tên dự án"
            name="name"
            rules={[{ required: true, message: "Bắt buộc" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Mô tả" name="description">
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            label="Ngày bắt đầu"
            name="start_date"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Ngày kết thúc"
            name="end_date"
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (
                    !value ||
                    value.isAfter(getFieldValue("start_date"))
                  ) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Phải sau ngày bắt đầu")
                  );
                },
              }),
            ]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Trạng thái" name="status">
            <Select>
              <Select.Option value="Lên kế hoạch">
                Lên kế hoạch
              </Select.Option>
              <Select.Option value="Đang tiến hành">
                Đang tiến hành
              </Select.Option>
            </Select>
          </Form.Item>

          {/* ===== MEMBERS ===== */}
          <Form.Item label="Thành viên">
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <Input
                placeholder="Email"
                value={newMember.email}
                onChange={(e) =>
                  setNewMember({ ...newMember, email: e.target.value })
                }
              />
              <Select
                value={newMember.role}
                style={{ width: 120 }}
                onChange={(v) =>
                  setNewMember({ ...newMember, role: v })
                }
              >
                <Select.Option value="manager">Manager</Select.Option>
                <Select.Option value="member">Member</Select.Option>
                <Select.Option value="viewer">Viewer</Select.Option>
              </Select>
              <Button onClick={addMember}>Thêm</Button>
            </div>

            <Table
              dataSource={members}
              columns={columns}
              rowKey="user_id"
              pagination={false}
              size="small"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== CONFIRM MEMBER ===== */}
      <Modal
        open={confirmOpen}
        title="Xác nhận thêm thành viên"
        onCancel={() => setConfirmOpen(false)}
        onOk={confirmAddMember}
      >
        <div style={{ textAlign: "center" }}>
          <Avatar size={70} src={avatarUrl} />
          <div style={{ marginTop: 12 }}>
            <strong>{userFound?.email}</strong>
            <div>Vai trò: {newMember.role}</div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ProjectForm;