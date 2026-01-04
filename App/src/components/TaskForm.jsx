import { Modal, Form, Input, Select, DatePicker, Button, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import TaskService from "@/services/Task.service";
import MemberService from "@/services/Member.service";

const { TextArea } = Input;

export default function TaskForm({
  open,
  projectId,
  parentId,
  project,
  onClose,
  onTaskAdded,
}) {
  const [form] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  /* =====================
     FETCH MEMBERS
  ===================== */
  useEffect(() => {
    if (!projectId) return;

    async function fetchMembers() {
      try {
        const res = await MemberService.getByProjectId(projectId);
        setUsers(
          (res || []).map((m) => ({
            label: m.name,
            value: m.user_id,
          }))
        );
      } catch (err) {
        console.error(err);
        message.error("Không thể tải danh sách thành viên");
      }
    }

    fetchMembers();
  }, [projectId]);

  /* =====================
     DATE LIMITS
  ===================== */
  const projectStart = useMemo(
    () => (project?.start_date ? dayjs(project.start_date) : null),
    [project]
  );

  const projectEnd = useMemo(
    () => (project?.end_date ? dayjs(project.end_date) : null),
    [project]
  );

  const disabledStartDate = (date) => {
    if (!projectStart || !projectEnd) return false;
    return date.isBefore(projectStart, "day") || date.isAfter(projectEnd, "day");
  };

  const disabledDueDate = (date) => {
    const start = form.getFieldValue("start_date");
    if (!projectStart || !projectEnd) return false;

    if (date.isBefore(projectStart, "day")) return true;
    if (date.isAfter(projectEnd, "day")) return true;
    if (start && date.isBefore(start, "day")) return true;

    return false;
  };

  /* =====================
     SUBMIT
  ===================== */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const user = JSON.parse(localStorage.getItem("user"));

      const payload = {
        project_id: projectId,
        title: values.title,
        description: values.description,
        priority: values.priority,
        start_date: values.start_date?.format("YYYY-MM-DD"),
        due_date: values.due_date?.format("YYYY-MM-DD"),
        created_by: user.id,
        members: values.assignees,
      };

      if (parentId) payload.parent_task_id = parentId;

      await TaskService.createTask(payload);

      message.success("Tạo công việc thành công");
      form.resetFields();
      onTaskAdded?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      message.error("Lỗi tạo công việc");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Thêm Công Việc Mới"
      width={500}
      destroyOnHidden
      maskClosable={false}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
        >
          Tạo
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          priority: "medium",
          assignees: [],
        }}
      >
        <Form.Item
          name="title"
          label="Tiêu đề"
          rules={[{ required: true, message: "Tiêu đề là bắt buộc" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <TextArea rows={3} />
        </Form.Item>

        <Form.Item name="priority" label="Ưu tiên">
          <Select
            options={[
              { label: "Cao", value: "high" },
              { label: "Trung bình", value: "medium" },
              { label: "Thấp", value: "low" },
            ]}
          />
        </Form.Item>

        <Form.Item name="assignees" label="Người được giao">
          <Select
            mode="multiple"
            placeholder="Chọn người được giao"
            options={users}
          />
        </Form.Item>

        <Form.Item
          name="start_date"
          label="Ngày bắt đầu"
          rules={[
            {
              validator: (_, value) => {
                if (!value || !projectStart || !projectEnd) {
                  return Promise.resolve();
                }

                if (
                  value.isBefore(projectStart, "day") ||
                  value.isAfter(projectEnd, "day")
                ) {
                  return Promise.reject(
                    new Error(
                      `Ngày bắt đầu phải trong khoảng ${project.start_date} → ${project.end_date}`
                    )
                  );
                }

                return Promise.resolve();
              },
            },
          ]}
        >
          <DatePicker
            style={{ width: "100%" }}
            disabledDate={disabledStartDate}
          />
        </Form.Item>

        <Form.Item
          name="due_date"
          label="Đến hạn"
          rules={[
            {
              validator: (_, value) => {
                const start = form.getFieldValue("start_date");

                if (!value || !projectStart || !projectEnd) {
                  return Promise.resolve();
                }

                if (
                  value.isBefore(projectStart, "day") ||
                  value.isAfter(projectEnd, "day")
                ) {
                  return Promise.reject(
                    new Error(
                      `Ngày kết thúc phải trong khoảng ${project.start_date} → ${project.end_date}`
                    )
                  );
                }

                if (start && value.isBefore(start, "day")) {
                  return Promise.reject(
                    new Error("Ngày kết thúc phải ≥ ngày bắt đầu")
                  );
                }

                return Promise.resolve();
              },
            },
          ]}
        >
          <DatePicker
            style={{ width: "100%" }}
            disabledDate={disabledDueDate}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}