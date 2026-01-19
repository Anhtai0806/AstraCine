import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import './AdminLayout.css';

const AdminLayout = () => {
    return (
        <div className="admin-layout">
            <nav className="admin-nav">
                <div className="nav-header">
                    <h1>🎬 AstraCine Admin</h1>
                </div>
                <ul className="nav-menu">
                    <li>
                        <Link to="/admin/genres" className="nav-link">
                            🎭 Genres
                        </Link>
                    </li>
                    <li>
                        <Link to="/admin/movies" className="nav-link">
                            🎥 Movies
                        </Link>
                    </li>
                </ul>
            </nav>
            <main className="admin-content">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
