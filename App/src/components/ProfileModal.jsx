import { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  Avatar,
  Upload,
  message
} from "antd";
import { UploadOutlined } from "@ant-design/icons";

import AuthService from "@/services/Account.service";
import FileService from "@/services/File.service";

import defaultAvatar from "@/assets/default-avatar.png";

export default function EditProfileModal({ open, onClose, user, onSaved }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState(defaultAvatar);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  /* ===== Load user ===== */
  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
      });
      loadAvatar(user.id);
    }
  }, [open, user]);

  const loadAvatar = async (userId) => {
    try {
      const res = await FileService.getAvatar(userId);
      setAvatar(res?.file_url || defaultAvatar);
    } catch {
      setAvatar(defaultAvatar);
    }
  };

  /* ===== Upload avatar ===== */
  const handleUpload = async ({ file }) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await FileService.uploadAvatar(user.id, formData);
      if (res?.result?.file_url) {
        setAvatar(`${res.result.file_url}?v=${Date.now()}`);
        message.success("Cập nhật ảnh đại diện thành công!");
        onSaved?.();
      }
      onClose(false);
    } catch {
      message.error("Tải ảnh lên thất bại!");
    }
  };

  /* ===== Submit profile ===== */
  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await AuthService.updateAccount(user.id, values);

      const updatedUser = { ...user, ...values };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("auth-changed"));

      message.success("Cập nhật thành công");
      onSaved?.(updatedUser);
      onClose(false);
    } catch {
      message.error("Cập nhật thất bại");
    } finally {
      setLoading(false);
    }
  };

  /* ===== Change password ===== */
  const submitPassword = async (values) => {
    setPasswordLoading(true);
    try {
      await AuthService.changePassword(
        user.id,
        values.oldPassword,
        values.newPassword
      );
      message.success("Đổi mật khẩu thành công!");
      setPasswordOpen(false);
    } catch {
      message.error("Đổi mật khẩu thất bại!");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <>
      <Modal
        title="Chỉnh sửa thông tin"
        open={open}
        onCancel={() => onClose(false)}
        footer={null}
        destroyOnHidden
      >
        {/* Avatar */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <Upload
            showUploadList={false}
            beforeUpload={(file) => file.type.startsWith("image/")}
            customRequest={handleUpload}
          >
            <Avatar src={avatar} size={80} />
            <div style={{ marginTop: 8 }}>
              <Button icon={<UploadOutlined />}>Upload</Button>
            </div>
          </Upload>
        </div>

        {/* Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
        >
          <Form.Item
            label="Tên người dùng"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Email" name="email">
            <Input disabled />
          </Form.Item>

          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setPasswordOpen(true)} style={{ marginRight: 8 }}>
              Đổi mật khẩu
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Lưu
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ===== Password modal ===== */}
      <Modal
        title="Đổi mật khẩu"
        open={passwordOpen}
        onCancel={() => setPasswordOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form layout="vertical" onFinish={submitPassword}>
          <Form.Item
            label="Mật khẩu hiện tại"
            name="oldPassword"
            rules={[{ required: true }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label="Mật khẩu mới"
            name="newPassword"
            rules={[{ required: true }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || value === getFieldValue("newPassword")) {
                    return Promise.resolve();
                  }
                  return Promise.reject("Mật khẩu không khớp!");
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>

          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setPasswordOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={passwordLoading}>
              Lưu
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}