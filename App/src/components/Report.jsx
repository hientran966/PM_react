/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { Row, Col, Card, Table, message } from "antd";
import ReactECharts from "echarts-for-react";

import ProjectService from "@/services/Project.service";
import { getSocket } from "@/plugins/socket";

import "@/assets/css/Report.css";

export default function Report({ projectId }) {
  const [kpi, setKpi] = useState([]);
  const [workloadByUser, setWorkloadByUser] = useState([]);

  const [taskStatusOption, setTaskStatusOption] = useState({});
  const [priorityOption, setPriorityOption] = useState({});
  const [progressTrendOption, setProgressTrendOption] = useState({});

  /* =====================
     LOAD DASHBOARD
  ===================== */
  const loadDashboardData = async () => {
    try {
      const data = await ProjectService.getReportData(projectId);

      setKpi([
        { label: "Tổng số Task", value: data.total_tasks },
        { label: "Hoàn thành", value: `${data.completion_rate}%` },
        { label: "Số thành viên", value: data.member_count },
      ]);

      setWorkloadByUser(
        data.workload
          .map((w) => ({
            ...w,
            name: w.name === "non_assign" ? "Chưa được giao" : w.name,
          }))
          .sort((a, b) => {
            if (a.name === "Chưa được giao") return -1;
            if (b.name === "Chưa được giao") return 1;
            return b.workload_percent - a.workload_percent;
          })
      );

      buildCharts(data);
    } catch (err) {
      console.error(err);
      message.error("Không thể tải dữ liệu báo cáo");
    }
  };

  /* =====================
     BUILD CHARTS
  ===================== */
  const buildCharts = (data) => {
    const STATUS_COLOR_MAP = {
      "Đang Chờ": "#ffb300",
      "Đang Tiến Hành": "#1976d2",
      Review: "#9e9e9e",
      "Đã Xong": "#388e3c",
    };

    const PRIORITY_COLOR_MAP = {
      Cao: "#e53935",
      "Trung Bình": "#fb8c00",
      Thấp: "#43a047",
    };

    const mapWithColor = (baseMap, list, keyField) =>
      Object.keys(baseMap)
        .map((key) => {
          const value =
            list.find(
              (d) =>
                d[keyField]?.toLowerCase() === key.toLowerCase()
            )?.count || 0;

          return value
            ? { name: key, value, itemStyle: { color: baseMap[key] } }
            : null;
        })
        .filter(Boolean);

    setTaskStatusOption({
      title: { text: "Trạng thái", left: "center" },
      tooltip: { trigger: "item" },
      legend: { bottom: 0 },
      series: [
        {
          type: "pie",
          radius: "60%",
          data: mapWithColor(
            STATUS_COLOR_MAP,
            data.task_status,
            "status"
          ),
        },
      ],
    });

    setPriorityOption({
      title: { text: "Độ ưu tiên", left: "center" },
      tooltip: { trigger: "item" },
      legend: { bottom: 0 },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          data: mapWithColor(
            PRIORITY_COLOR_MAP,
            data.priority,
            "priority"
          ),
        },
      ],
    });

    setProgressTrendOption({
      title: { text: "Tiến độ", left: "center" },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: data.progress_trend.map((d) =>
          new Date(d.date + "T00:00:00").toLocaleDateString("vi-VN")
        ),
      },
      yAxis: { type: "value", max: 100 },
      series: [
        {
          data: data.progress_trend.map((d) => d.progress),
          type: "line",
          smooth: true,
          label: { show: true },
          markLine: {
            symbol: "none",
            data: [{ xAxis: data.project.end_date.split("T")[0] }],
          },
        },
      ],
    });
  };

  /* =====================
     SOCKET
  ===================== */
  useEffect(() => {
    loadDashboardData();

    const socket = getSocket();
    if (!socket) return;

    socket.on("task_updated", loadDashboardData);

    return () => socket.off("task_updated", loadDashboardData);
  }, [projectId]);

  /* =====================
     TABLE
  ===================== */
  const columns = [
    {
      title: "Tên thành viên",
      dataIndex: "name",
    },
    {
      title: "% Workload",
      dataIndex: "workload_percent",
    },
    {
      title: "Số lượng Task",
      dataIndex: "assigned_tasks",
    },
  ];

  const rowClassName = (row) => {
    if (!row.assigned_tasks) return "";
    if (row.name === "Chưa được giao") return "workload-info";
    if (row.workload_percent >= 70) return "workload-red";
    if (row.workload_percent >= 50) return "workload-yellow";
    return "";
  };

  /* =====================
     RENDER
  ===================== */
  return (
    <div className="dashboard-container">
      {/* KPI */}
      <Row gutter={16} className="kpi-row">
        {kpi.map((item) => (
          <Col span={8} key={item.label}>
            <Card className="kpi-card">
              <div className="kpi-value">{item.value}</div>
              <div className="kpi-label">{item.label}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts */}
      <Row gutter={20} style={{ marginTop: 20 }}>
        <Col span={12}>
          <Card>
            <ReactECharts option={taskStatusOption} style={{ height: 300 }} />
          </Card>
        </Col>

        <Col span={12}>
          <Card>
            <ReactECharts option={priorityOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={20} style={{ marginTop: 20 }}>
        <Col span={24}>
          <Card>
            <ReactECharts
              option={progressTrendOption}
              style={{ height: 350 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Members */}
      <Row gutter={16} style={{ marginTop: 20 }}>
        <Col span={24}>
          <Card title="Thành viên dự án">
            <Table
              dataSource={workloadByUser}
              columns={columns}
              rowKey="name"
              pagination={false}
              rowClassName={rowClassName}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}