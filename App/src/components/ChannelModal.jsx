import { useEffect, useMemo, useState } from "react";
import { Modal, Form, Input, Select, message } from "antd";
import { useDispatch, useSelector } from "react-redux";

import {
  createChannel,
  updateChannel,
  getChannelDetail,
} from "@/stores/chatSlice";
import { selectChannels } from "@/stores/chatSelectors";

import MemberService from "@/services/Member.service";

const { TextArea } = Input;

export default function ChannelModal({
  open,
  onClose,
  projectId,
  channelId = null,
  onAdded,
  onUpdated,
}) {
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  const channels = useSelector(selectChannels);
  const isEdit = useMemo(() => !!channelId, [channelId]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  /* =====================
     LOAD MEMBERS
  ===================== */
  const fetchMembers = async () => {
    if (!projectId) return;

    try {
      const res = await MemberService.getByProjectId(projectId);
      setUsers(
        (res || []).map((m) => ({
          label: m.name,
          value: m.user_id,
        }))
      );
    } catch {
      message.error("Không thể tải danh sách thành viên");
    }
  };

  /* =====================
     LOAD CHANNEL DETAIL
  ===================== */
  const loadChannel = async () => {
    if (!channelId) return;

    const cached = channels.find((c) => c.id === channelId);
    const channel =
      cached ||
      (await dispatch(getChannelDetail(channelId)).unwrap());

    form.setFieldsValue({
      name: channel.name,
      description: channel.description,
      members: channel.members?.map((m) => m.user_id) || [],
    });
  };

  /* =====================
     EFFECTS
  ===================== */
  useEffect(() => {
    if (!open) return;

    fetchMembers();

    if (isEdit) {
      loadChannel();
    } else {
      form.resetFields();
    }
  }, [open]);

  /* =====================
     SUBMIT
  ===================== */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        project_id: projectId,
        name: values.name,
        description: values.description,
        members: values.members,
      };

      if (isEdit) {
        await dispatch(
          updateChannel({ channelId, payload })
        ).unwrap();
        message.success("Cập nhật kênh thành công");
        onUpdated?.();
      } else {
        const user = JSON.parse(localStorage.getItem("user"));
        await dispatch(
          createChannel({ ...payload, created_by: user.id })
        ).unwrap();
        message.success("Tạo nhóm chat thành công");
        onAdded?.();
      }

      onClose();
      form.resetFields();
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      message.error(isEdit ? "Cập nhật thất bại" : "Tạo nhóm thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? "Chỉnh sửa nhóm chat" : "Thêm nhóm chat mới"}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={isEdit ? "Lưu" : "Tạo"}
      confirmLoading={loading}
      destroyOnHidden
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: "",
          description: "",
          members: [],
        }}
      >
        <Form.Item
          label="Tiêu đề"
          name="name"
          rules={[{ required: true, message: "Tiêu đề là bắt buộc" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item label="Mô tả" name="description">
          <TextArea rows={3} />
        </Form.Item>

        <Form.Item label="Thành viên" name="members">
          <Select
            mode="multiple"
            placeholder="Chọn thành viên"
            options={users}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
