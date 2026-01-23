import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Space } from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  DashboardOutlined, 
  VideoCameraOutlined, 
  AppstoreOutlined, 
  UserOutlined,
  BarcodeOutlined,
  CalendarOutlined,
  LogoutOutlined 
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  
  const navigate = useNavigate();
  const location = useLocation();

  // Menu bên trái
  const items = [
    { key: '/admin/dashboard', icon: <DashboardOutlined />, label: 'Thống kê' },
    { key: '/admin/movies', icon: <VideoCameraOutlined />, label: 'Quản lý Phim' },
    { key: '/admin/showtimes', icon: <CalendarOutlined />, label: 'Lịch chiếu' },
    { key: '/admin/rooms', icon: <AppstoreOutlined />, label: 'Phòng & Ghế' },
    { key: '/admin/combos', icon: <BarcodeOutlined />, label: 'Bắp & Nước' },
    { key: '/admin/users', icon: <UserOutlined />, label: 'Nhân viên & Khách' },
  ];

  // Menu dropdown của User
  const userMenu = [
    { key: 'profile', label: 'Thông tin tài khoản' },
    { key: 'logout', label: 'Đăng xuất', icon: <LogoutOutlined />, danger: true }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} width={250} style={{ background: '#001529' }}>
        <div style={{ height: 64, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <h2 style={{ color: 'white', fontSize: collapsed ? '12px' : '20px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {collapsed ? 'AC' : 'AstraCine Admin'}
            </h2>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['/admin/dashboard']}
          selectedKeys={[location.pathname]}
          items={items}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 24 }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <Dropdown menu={{ items: userMenu }}>
            <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>Admin User</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;