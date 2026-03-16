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
            setError('Failed to fetch genres. Please try again.');
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
            setError('Failed to save genre. Please try again.');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this genre?')) {
            try {
                await genreAPI.delete(id);
                fetchGenres();
            } catch (err) {
                setError('Failed to delete genre. It might be in use.');
                console.error(err);
            }
        }
    };

    if (loading) return (
        <div className="admin-genres-page">
            <div className="loading-spinner">
                <div className="spinner-border"></div>
            </div>
        </div>
    );

    return (
        <div className="admin-genres-page">
            <div className="admin-genres-container">
                <div className="admin-genres-header">
                    <h2>Manage Genres</h2>
                    <button className="btn-custom btn-primary btn-add-genre" onClick={() => handleShowModal()}>
                        <FaPlus className="me-2" /> Add Genre
                    </button>
                </div>

                {error && (
                    <div className="alert-custom alert-danger">
                        <span>{error}</span>
                        <button className="alert-close" onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                <div className="table-responsive">
                    <table className="genres-table custom-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Actions</th>
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
                                    <td colSpan="3" className="no-data-message">No genres found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {showModal && (
                    <div className="custom-modal-backdrop" onClick={handleCloseModal}>
                        <div className="custom-modal-panel genre-modal" onClick={e => e.stopPropagation()}>
                            <div className="custom-modal-header">
                                <h3>{isEditing ? 'Edit Genre' : 'Add New Genre'}</h3>
                                <button className="modal-close-btn" onClick={handleCloseModal}>✕</button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="custom-modal-body">
                                    <div className="form-group-custom">
                                        <label>Genre Name</label>
                                        <input
                                            type="text"
                                            className="form-control-custom"
                                            placeholder="Enter genre name"
                                            value={currentGenre.name}
                                            onChange={(e) => setCurrentGenre({ ...currentGenre, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="custom-modal-footer">
                                    <button type="button" className="btn-custom btn-secondary" onClick={handleCloseModal}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-custom btn-primary">
                                        {isEditing ? 'Update' : 'Create'}
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
