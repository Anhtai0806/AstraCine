import React from 'react';
import { Table, Button, Space, Tag, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const ComboManager = () => {
  // Dữ liệu giả (Sau này sẽ gọi API để thay thế)
  const data = [
    { id: 1, name: 'Combo Solo (1 Bắp + 1 Nước)', price: 75000, status: 'ACTIVE' },
    { id: 2, name: 'Combo Couple (1 Bắp lớn + 2 Nước)', price: 120000, status: 'ACTIVE' },
    { id: 3, name: 'Combo Family (2 Bắp + 4 Nước)', price: 200000, status: 'INACTIVE' },
  ];

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Tên Combo',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <b>{text}</b>,
    },
    {
      title: 'Giá bán',
      dataIndex: 'price',
      key: 'price',
      render: (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>
          {status === 'ACTIVE' ? 'Đang bán' : 'Ngừng bán'}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="primary" icon={<EditOutlined />} ghost>Sửa</Button>
          <Button type="primary" danger icon={<DeleteOutlined />}>Xóa</Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Danh sách Combo Bắp & Nước" extra={
      <Button type="primary" icon={<PlusOutlined />}>Thêm Combo mới</Button>
    }>
      <Table columns={columns} dataSource={data} rowKey="id" bordered />
    </Card>
  );
};

export default ComboManager;