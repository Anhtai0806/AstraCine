import React, { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Spin, Alert, Radio } from "antd";
import { UserOutlined, VideoCameraOutlined, DollarOutlined } from "@ant-design/icons";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { dashboardApi } from "../../api/dashboardApi";
import "./Dashboard.css";

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [chartType, setChartType] = useState('day');

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const data = await dashboardApi.getStatistics(chartType);
                setStats(data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch dashboard stats", err);
                const serverMsg = err.response?.data?.message || err.response?.data?.error || err.message;
                const path = err.response?.data?.path || "";
                const trace = err.response?.data?.trace || "";
                setError(`Lỗi: ${serverMsg} ${path}. Trace: ${trace.substring(0, 100)}...`);
                setLoading(false);
            }
        };

        fetchStats();
    }, [chartType]);

    if (loading) {
        return (
            <div className="dashboard-loading">
                <Spin size="large" tip="Đang tải dữ liệu..." />
            </div>
        );
    }

    if (error) {
        return <Alert message="Lỗi" description={error} type="error" showIcon />;
    }

    return (
        <div className="dashboard-container">
            <h2 className="dashboard-title">Tổng Quan Hệ Thống</h2>
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                    <Card className="dashboard-card" hoverable bodyStyle={{ padding: "20px" }}>
                        <Statistic
                            title="Tổng Số Khách Hàng"
                            value={stats?.totalCustomers}
                            prefix={<UserOutlined style={{ color: "#1890ff" }} />}
                            valueStyle={{ color: "#1890ff", fontWeight: "bold" }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card className="dashboard-card" hoverable bodyStyle={{ padding: "20px" }}>
                        <Statistic
                            title="Phim Đang Chiếu"
                            value={stats?.totalMoviesShowing}
                            prefix={<VideoCameraOutlined style={{ color: "#52c41a" }} />}
                            valueStyle={{ color: "#52c41a", fontWeight: "bold" }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card className="dashboard-card" hoverable bodyStyle={{ padding: "20px" }}>
                        <Statistic
                            title="Tổng Doanh Thu"
                            value={stats?.totalRevenue}
                            prefix={<DollarOutlined style={{ color: "#faad14" }} />}
                            valueStyle={{ color: "#faad14", fontWeight: "bold" }}
                            suffix=" VNĐ"
                        />
                    </Card>
                </Col>
            </Row>

            <div className="dashboard-chart-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Biểu Đồ Doanh Thu</h3>
                    <Radio.Group value={chartType} onChange={(e) => setChartType(e.target.value)}>
                        <Radio.Button value="day">Theo Ngày (7 Ngày)</Radio.Button>
                        <Radio.Button value="month">Theo Tháng (6 Tháng)</Radio.Button>
                    </Radio.Group>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={stats?.revenueChart} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${value.toLocaleString()} VNĐ`} />
                        <Legend />
                        <Bar dataKey="total" name="Doanh Thu" fill="#1890ff" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default Dashboard;