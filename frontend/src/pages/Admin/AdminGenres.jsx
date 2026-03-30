import React, { useState, useEffect } from 'react';
import { genreAPI } from '../../api/adminApi';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import './AdminGenres.css';

const AdminGenres = () => {
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [currentGenre, setCurrentGenre] = useState({ name: '' });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchGenres();
    }, []);

    const fetchGenres = async () => {
        try {
            setLoading(true);
            const response = await genreAPI.getAll();
            setGenres(response.data);
            setError(null);
        } catch (err) {
            setError('Khong the tai danh sach the loai. Vui long thu lai.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleShowModal = (genre = null) => {
        if (genre) {
            setCurrentGenre(genre);
            setIsEditing(true);
        } else {
            setCurrentGenre({ name: '' });
            setIsEditing(false);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentGenre({ name: '' });
        setError(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await genreAPI.update(currentGenre.id, currentGenre);
            } else {
                await genreAPI.create(currentGenre);
            }
            fetchGenres();
            handleCloseModal();
        } catch (err) {
            setError('Khong the luu the loai. Vui long thu lai.');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Ban co chac muon xoa the loai nay khong?')) {
            try {
                await genreAPI.delete(id);
                fetchGenres();
            } catch (err) {
                setError('Khong the xoa the loai. The loai co the dang duoc su dung.');
                console.error(err);
            }
        }
    };

    if (loading) {
        return (
            <div className="admin-genres-page">
                <div className="loading-spinner">
                    <div className="spinner-border"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-genres-page">
            <div className="admin-genres-container">
                <div className="admin-genres-header">
                    <h2>Quản Lý Thể Loại</h2>
                    <button className="btn-custom btn-primary btn-add-genre" onClick={() => handleShowModal()}>
                        <FaPlus className="me-2" /> Thêm thể loại
                    </button>
                </div>

                {error && (
                    <div className="alert-custom alert-danger">
                        <span>{error}</span>
                        <button className="alert-close" onClick={() => setError(null)}>x</button>
                    </div>
                )}

                <div className="table-responsive">
                    <table className="genres-table custom-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Tên thể loại</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {genres.length > 0 ? (
                                genres.map((genre) => (
                                    <tr key={genre.id}>
                                        <td className="genre-id">{genre.id}</td>
                                        <td className="genre-name">{genre.name}</td>
                                        <td>
                                            <div className="genre-actions">
                                                <button className="btn-custom btn-warning btn-sm btn-edit-genre" onClick={() => handleShowModal(genre)}>
                                                    <FaEdit />
                                                </button>
                                                <button className="btn-custom btn-danger btn-sm btn-delete-genre" onClick={() => handleDelete(genre.id)}>
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className="no-data-message">Khong co the loai nao.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {showModal && (
                    <div className="custom-modal-backdrop" onClick={handleCloseModal}>
                        <div className="custom-modal-panel genre-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="custom-modal-header">
                                <h3>{isEditing ? 'Chỉnh sửa thể loại' : 'Thêm thể loại mới'}</h3>
                                <button className="modal-close-btn" onClick={handleCloseModal}>x</button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="custom-modal-body">
                                    <div className="form-group-custom">
                                        <label>Tên thể loại</label>
                                        <input
                                            type="text"
                                            className="form-control-custom"
                                            placeholder="Nhập tên thể loại"
                                            value={currentGenre.name}
                                            onChange={(e) => setCurrentGenre({ ...currentGenre, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="custom-modal-footer">
                                    <button type="button" className="btn-custom btn-secondary" onClick={handleCloseModal}>
                                        Huỷ
                                    </button>
                                    <button type="submit" className="btn-custom btn-primary">
                                        {isEditing ? 'Cập nhật' : 'Thêm mới'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminGenres;
