import React, { useState, useEffect } from 'react';
import { genreAPI } from '../services/api';
import './GenrePage.css';

const GenrePage = () => {
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({ name: '' });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchGenres();
    }, []);

    const fetchGenres = async () => {
        setLoading(true);
        try {
            const response = await genreAPI.getAll();
            setGenres(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch genres: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingId) {
                await genreAPI.update(editingId, formData);
            } else {
                await genreAPI.create(formData);
            }
            setFormData({ name: '' });
            setEditingId(null);
            fetchGenres();
            setError('');
        } catch (err) {
            setError('Failed to save genre: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (genre) => {
        setFormData({ name: genre.name });
        setEditingId(genre.id);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this genre?')) return;

        setLoading(true);
        try {
            await genreAPI.delete(id);
            fetchGenres();
            setError('');
        } catch (err) {
            setError('Failed to delete genre: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({ name: '' });
        setEditingId(null);
    };

    return (
        <div className="genre-page">
            <div className="page-header">
                <h1>🎭 Genre Management</h1>
                <p>Manage movie genres for AstraCine</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="genre-container">
                <div className="genre-form-card">
                    <h2>{editingId ? 'Edit Genre' : 'Add New Genre'}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="name">Genre Name</label>
                            <input
                                type="text"
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ name: e.target.value })}
                                placeholder="e.g., Action, Horror, Comedy"
                                required
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? '⏳ Saving...' : editingId ? '✏️ Update' : '➕ Create'}
                            </button>
                            {editingId && (
                                <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                                    ❌ Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="genre-list-card">
                    <h2>All Genres ({genres.length})</h2>
                    {loading && <div className="loading">Loading...</div>}
                    <div className="genre-list">
                        {genres.map((genre) => (
                            <div key={genre.id} className="genre-item">
                                <div className="genre-info">
                                    <span className="genre-name">{genre.name}</span>
                                    <span className="genre-id">ID: {genre.id}</span>
                                </div>
                                <div className="genre-actions">
                                    <button
                                        className="btn-icon btn-edit"
                                        onClick={() => handleEdit(genre)}
                                        title="Edit"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="btn-icon btn-delete"
                                        onClick={() => handleDelete(genre.id)}
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                        {genres.length === 0 && !loading && (
                            <div className="empty-state">No genres found. Create your first genre!</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GenrePage;
