import React from 'react';
import { Card, Col, Row, Statistic, Table, Tag } from 'antd';
import { ArrowUpOutlined, DollarCircleOutlined, UserOutlined, ShoppingCartOutlined } from '@ant-design/icons';

const Dashboard = () => {
  // Dữ liệu giả cho bảng giao dịch gần đây
  const recentTransactions = [
    { key: '1', user: 'Nguyễn Văn A', amount: '250.000 đ', time: '10:30 AM', status: 'Success' },
    { key: '2', user: 'Trần Thị B', amount: '120.000 đ', time: '10:45 AM', status: 'Pending' },
    { key: '3', user: 'Lê Văn C', amount: '500.000 đ', time: '11:00 AM', status: 'Success' },
  ];

  const columns = [
    { title: 'Khách hàng', dataIndex: 'user', key: 'user' },
    { title: 'Tổng tiền', dataIndex: 'amount', key: 'amount' },
    { title: 'Thời gian', dataIndex: 'time', key: 'time' },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => (
        <Tag color={status === 'Success' ? 'green' : 'orange'}>{status}</Tag>
      )
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 20, fontWeight: 'bold' }}>Tổng Quan Doanh Thu</h2>
      
      {/* 4 Thẻ Thống Kê */}
      <Row gutter={16}>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#e6f7ff' }}>
            <Statistic
              title="Tổng Doanh Thu"
              value={112893000}
              precision={0}
              valueStyle={{ color: '#096dd9' }}
              prefix={<DollarCircleOutlined />}
              suffix="đ"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic
              title="Vé Đã Bán"
              value={854}
              valueStyle={{ color: '#389e0d' }}
              prefix={<ArrowUpOutlined />}
              suffix="Vé"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#fff7e6' }}>
            <Statistic
              title="Khách Hàng Mới"
              value={93}
              valueStyle={{ color: '#d46b08' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ background: '#fff1f0' }}>
            <Statistic
              title="Combo Bắp Nước"
              value={120}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Bảng Giao Dịch Gần Đây */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Giao Dịch Gần Nhất</h3>
        <Table 
            columns={columns} 
            dataSource={recentTransactions} 
            pagination={false} 
            bordered
        />
      </div>
    </div>
  );
};

export default Dashboard;