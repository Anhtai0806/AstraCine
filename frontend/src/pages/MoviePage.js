import React, { useState, useEffect } from 'react';
import { movieAPI, genreAPI } from '../services/api';
import './MoviePage.css';

const MoviePage = () => {
    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTitle, setSearchTitle] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterGenre, setFilterGenre] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        durationMinutes: '',
        releaseDate: '',
        endDate: '',
        ageRating: 'P',
        status: 'SHOWING',
        trailerUrl: '',
        genreIds: [],
    });
    const [posterFile, setPosterFile] = useState(null);

    useEffect(() => {
        fetchMovies();
        fetchGenres();
    }, []);

    const fetchGenres = async () => {
        try {
            const response = await genreAPI.getAll();
            setGenres(response.data);
        } catch (err) {
            console.error('Failed to fetch genres:', err);
        }
    };

    const fetchMovies = async () => {
        setLoading(true);
        try {
            const response = await movieAPI.getAll(filterStatus);
            setMovies(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch movies: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchTitle.trim()) {
            fetchMovies();
            return;
        }
        setLoading(true);
        try {
            const response = await movieAPI.search(searchTitle);
            setMovies(response.data);
            setError('');
        } catch (err) {
            setError('Search failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleFilterByGenre = async () => {
        if (!filterGenre) {
            fetchMovies();
            return;
        }
        setLoading(true);
        try {
            const response = await movieAPI.getByGenre(filterGenre);
            setMovies(response.data);
            setError('');
        } catch (err) {
            setError('Filter failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const formDataToSend = new FormData();
        formDataToSend.append('title', formData.title);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('durationMinutes', formData.durationMinutes);
        formDataToSend.append('releaseDate', formData.releaseDate);
        formDataToSend.append('endDate', formData.endDate);
        formDataToSend.append('ageRating', formData.ageRating);
        formDataToSend.append('status', formData.status);
        formDataToSend.append('trailerUrl', formData.trailerUrl);

        formData.genreIds.forEach(id => {
            formDataToSend.append('genreIds', id);
        });

        if (posterFile) {
            formDataToSend.append('poster', posterFile);
        }

        try {
            if (editingId) {
                await movieAPI.update(editingId, formDataToSend);
            } else {
                await movieAPI.create(formDataToSend);
            }
            resetForm();
            fetchMovies();
            setError('');
        } catch (err) {
            setError('Failed to save movie: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (movie) => {
        setFormData({
            title: movie.title,
            description: movie.description,
            durationMinutes: movie.durationMinutes,
            releaseDate: movie.releaseDate,
            endDate: movie.endDate || '',
            ageRating: movie.ageRating,
            status: movie.status,
            trailerUrl: movie.trailerUrl || '',
            genreIds: movie.genres.map(g => g.id),
        });
        setEditingId(movie.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this movie?')) return;

        setLoading(true);
        try {
            await movieAPI.delete(id);
            fetchMovies();
            setError('');
        } catch (err) {
            setError('Failed to delete movie: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            durationMinutes: '',
            releaseDate: '',
            endDate: '',
            ageRating: 'P',
            status: 'SHOWING',
            trailerUrl: '',
            genreIds: [],
        });
        setPosterFile(null);
        setEditingId(null);
        setShowForm(false);
    };

    const handleGenreToggle = (genreId) => {
        setFormData(prev => ({
            ...prev,
            genreIds: prev.genreIds.includes(genreId)
                ? prev.genreIds.filter(id => id !== genreId)
                : [...prev.genreIds, genreId]
        }));
    };

    return (
        <div className="movie-page">
            <div className="page-header">
                <h1>🎥 Movie Management</h1>
                <p>Manage movies for AstraCine cinema</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="controls-section">
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search by title..."
                        value={searchTitle}
                        onChange={(e) => setSearchTitle(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button onClick={handleSearch} className="btn btn-primary">
                        🔍 Search
                    </button>
                </div>

                <div className="filters">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="SHOWING">Showing</option>
                        <option value="COMING_SOON">Coming Soon</option>
                        <option value="ENDED">Ended</option>
                    </select>

                    <select
                        value={filterGenre}
                        onChange={(e) => setFilterGenre(e.target.value)}
                    >
                        <option value="">All Genres</option>
                        {genres.map(genre => (
                            <option key={genre.id} value={genre.id}>{genre.name}</option>
                        ))}
                    </select>

                    <button onClick={fetchMovies} className="btn btn-secondary">
                        🔄 Reset
                    </button>
                    <button onClick={handleFilterByGenre} className="btn btn-primary">
                        Filter by Genre
                    </button>
                </div>

                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn btn-primary btn-add"
                >
                    {showForm ? '❌ Cancel' : '➕ Add New Movie'}
                </button>
            </div>

            {showForm && (
                <div className="movie-form-card">
                    <h2>{editingId ? 'Edit Movie' : 'Add New Movie'}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Duration (minutes) *</label>
                                <input
                                    type="number"
                                    value={formData.durationMinutes}
                                    onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                                    required
                                    min="1"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Description *</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows="4"
                                required
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Release Date *</label>
                                <input
                                    type="date"
                                    value={formData.releaseDate}
                                    onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>End Date</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Age Rating *</label>
                                <select
                                    value={formData.ageRating}
                                    onChange={(e) => setFormData({ ...formData, ageRating: e.target.value })}
                                >
                                    <option value="P">P - General</option>
                                    <option value="C13">C13 - 13+</option>
                                    <option value="C16">C16 - 16+</option>
                                    <option value="C18">C18 - 18+</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Status *</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="SHOWING">Showing</option>
                                    <option value="COMING_SOON">Coming Soon</option>
                                    <option value="ENDED">Ended</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Trailer URL</label>
                            <input
                                type="url"
                                value={formData.trailerUrl}
                                onChange={(e) => setFormData({ ...formData, trailerUrl: e.target.value })}
                                placeholder="https://youtube.com/..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Poster Image</label>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => setPosterFile(e.target.files[0])}
                            />
                            {posterFile && <small>Selected: {posterFile.name}</small>}
                        </div>

                        <div className="form-group">
                            <label>Genres *</label>
                            <div className="genre-checkboxes">
                                {genres.map(genre => (
                                    <label key={genre.id} className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={formData.genreIds.includes(genre.id)}
                                            onChange={() => handleGenreToggle(genre.id)}
                                        />
                                        {genre.name}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? '⏳ Saving...' : editingId ? '✏️ Update Movie' : '➕ Create Movie'}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                ❌ Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="movie-list">
                <h2>All Movies ({movies.length})</h2>
                {loading && <div className="loading">Loading...</div>}
                <div className="movie-grid">
                    {movies.map((movie) => (
                        <div key={movie.id} className="movie-card">
                            {movie.posterUrl && (
                                <div className="movie-poster">
                                    <img src={`http://localhost:8080/${movie.posterUrl}`} alt={movie.title} />
                                </div>
                            )}
                            <div className="movie-content">
                                <h3>{movie.title}</h3>
                                <div className="movie-meta">
                                    <span className={`status-badge status-${movie.status.toLowerCase()}`}>
                                        {movie.status}
                                    </span>
                                    <span className="age-rating">{movie.ageRating}</span>
                                    <span className="duration">⏱️ {movie.durationMinutes} min</span>
                                </div>
                                <p className="movie-description">{movie.description}</p>
                                <div className="movie-genres">
                                    {movie.genres.map(genre => (
                                        <span key={genre.id} className="genre-tag">{genre.name}</span>
                                    ))}
                                </div>
                                <div className="movie-dates">
                                    <small>📅 {movie.releaseDate}</small>
                                    {movie.endDate && <small>→ {movie.endDate}</small>}
                                </div>
                                <div className="movie-actions">
                                    <button className="btn btn-edit" onClick={() => handleEdit(movie)}>
                                        ✏️ Edit
                                    </button>
                                    <button className="btn btn-delete" onClick={() => handleDelete(movie.id)}>
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {movies.length === 0 && !loading && (
                        <div className="empty-state">No movies found. Add your first movie!</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MoviePage;
