import React from 'react';
import { Table, Button, Tag, Image, Space } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';

const MovieManager = () => {
  // Mock Data
  const movies = [
    {
      id: 1,
      title: 'Mai',
      poster: 'https://upload.wikimedia.org/wikipedia/vi/8/86/Mai_film_poster.jpg', // Link ảnh test
      duration: 131,
      releaseDate: '2024-02-10',
      status: 'SHOWING'
    },
    {
      id: 2,
      title: 'Dune: Part Two',
      poster: 'https://upload.wikimedia.org/wikipedia/en/5/52/Dune_Part_Two_poster.jpeg',
      duration: 166,
      releaseDate: '2024-03-01',
      status: 'COMING_SOON'
    }
  ];

  const columns = [
    {
      title: 'Poster',
      dataIndex: 'poster',
      key: 'poster',
      render: (src) => <Image width={50} src={src} fallback="https://via.placeholder.com/50" />
    },
    {
      title: 'Tên Phim',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <span style={{ fontSize: 16, fontWeight: 500 }}>{text}</span>
    },
    {
      title: 'Thời lượng',
      dataIndex: 'duration',
      key: 'duration',
      render: (mins) => `${mins} phút`
    },
    {
      title: 'Ngày khởi chiếu',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = status === 'SHOWING' ? 'green' : 'blue';
        let text = status === 'SHOWING' ? 'Đang chiếu' : 'Sắp chiếu';
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: () => (
        <Space>
           <Button icon={<EditOutlined />} type="default">Sửa</Button>
        </Space>
      )
    }
  ];

  return (
    <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <h2>Quản Lý Phim</h2>
            <Button type="primary" icon={<PlusOutlined />} size="large">Thêm Phim Mới</Button>
        </div>
        <Table columns={columns} dataSource={movies} rowKey="id" />
    </div>
  );
};

export default MovieManager;