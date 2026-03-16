import React, { useState, useEffect } from 'react';
import { movieAPI, genreAPI } from '../../api/adminApi';
import { FaEdit, FaTrash, FaPlus, FaSearch } from 'react-icons/fa';
import './AdminMovies.css';

const emptyMovie = {
    title: '',
    description: '',
    duration: '',
    releaseDate: '',
    endDate: '',
    ageRating: 'ALL_AGE',
    status: 'NOW_SHOWING',
    genreId: '',
    poster: null,
    trailer: null
};

const AdminMovies = () => {
    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentMovie, setCurrentMovie] = useState(emptyMovie);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchMovies();
        fetchGenres();
    }, []);

    const fetchMovies = async () => {
        try {
            setLoading(true);
            const res = await movieAPI.getAll();
            setMovies(res.data);
        } catch {
            setError('Failed to fetch movies');
        } finally {
            setLoading(false);
        }
    };

    const fetchGenres = async () => {
        try {
            const res = await genreAPI.getAll();
            setGenres(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return fetchMovies();

        try {
            setLoading(true);
            const res = await movieAPI.search(searchTerm);
            setMovies(res.data);
        } catch {
            setError('Search failed');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (movie = null) => {
        if (movie) {
            setCurrentMovie({
                ...movie,
                duration: movie.durationMinutes || '',
                releaseDate: movie.releaseDate?.slice(0, 10) || '',
                endDate: movie.endDate?.slice(0, 10) || '',
                ageRating: movie.ageRating || 'ALL_AGE',
                genreId: movie.genres?.[0]?.id || '',
                poster: null,
                trailer: null
            });
            setIsEditing(true);
        } else {
            setCurrentMovie(emptyMovie);
            setIsEditing(false);
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setCurrentMovie(emptyMovie);
        setError(null);
    };

    const calculateStatus = (release, end) => {
        if (!release) return 'COMING_SOON';
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const releaseDate = new Date(release);
        const endDate = end ? new Date(end) : null;

        if (now < releaseDate) return 'COMING_SOON';
        if (endDate && now > endDate) return 'STOPPED';
        return 'NOW_SHOWING';
    };

    const handleChange = (e) => {
        const { name, value, files } = e.target;

        setCurrentMovie(prev => {
            let updated = { ...prev, [name]: files ? files[0] : value };

            if (name === 'releaseDate' && value) {
                // Determine next day for endDate default/min
                const releaseDate = new Date(value);
                const nextDay = new Date(releaseDate);
                nextDay.setDate(releaseDate.getDate() + 1);
                const nextDayStr = nextDay.toISOString().split('T')[0];

                // Auto-set endDate if empty or invalid (<= releaseDate)
                if (!updated.endDate || updated.endDate <= value) {
                    updated.endDate = nextDayStr;
                }
            }

            // Auto-update status based on dates
            if (name === 'releaseDate' || name === 'endDate') {
                updated.status = calculateStatus(updated.releaseDate, updated.endDate);
            }

            return updated;
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // VALIDATION
        if (currentMovie.releaseDate && currentMovie.endDate) {
            if (new Date(currentMovie.endDate) <= new Date(currentMovie.releaseDate)) {
                setError('End Date must be greater than Release Date');
                return;
            }
        }

        const formData = new FormData();
        formData.append('title', currentMovie.title);
        formData.append('description', currentMovie.description);
        formData.append('durationMinutes', currentMovie.duration);
        formData.append('releaseDate', currentMovie.releaseDate);
        formData.append('endDate', currentMovie.endDate);
        formData.append('ageRating', currentMovie.ageRating);
        formData.append('status', currentMovie.status);
        formData.append('genreIds', currentMovie.genreId);

        if (currentMovie.poster) formData.append('poster', currentMovie.poster);
        if (currentMovie.trailer) formData.append('trailer', currentMovie.trailer);

        try {
            setLoading(true);
            isEditing
                ? await movieAPI.update(currentMovie.id, formData)
                : await movieAPI.create(formData);

            closeModal();
            fetchMovies();
        } catch {
            setError('Failed to save movie');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this movie?')) return;
        try {
            await movieAPI.delete(id);
            fetchMovies();
        } catch {
            setError('Delete failed');
        }
    };

    if (loading && !movies.length) {
        return (
            <div className="admin-movies-page">
                <div className="loading-spinner">
                    <div className="spinner-border"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-movies-page">
            <div className="admin-movies-container">

                {/* HEADER */}
                <div className="admin-movies-header">
                    <h2>Manage Movies</h2>
                    <button className="btn-custom btn-primary btn-add-movie" onClick={() => openModal()}>
                        <FaPlus className="me-2" /> Add Movie
                    </button>
                </div>

                {/* SEARCH */}
                <form onSubmit={handleSearch} className="search-section">
                    <div className="form-row align-items-center mb-0">
                        <div className="form-col" style={{ flex: 2 }}>
                            <input
                                className="form-control-custom"
                                placeholder="Search by title..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="form-col">
                            <button type="submit" className="btn-custom btn-primary btn-search w-100">
                                <FaSearch className="me-2" /> Search
                            </button>
                        </div>
                    </div>
                </form>

                {error && (
                    <div className="alert-custom alert-danger">
                        <span>{error}</span>
                        <button className="alert-close" onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                {/* TABLE */}
                <div className="movies-table table-responsive">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Poster</th>
                                <th>Title</th>
                                <th>Genre</th>
                                <th>Duration</th>
                                <th>Age</th>
                                <th>Status</th>
                                <th>Release</th>
                                <th>End</th>
                                <th>Trailer</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movies.length === 0 && (
                                <tr>
                                    <td colSpan="11" className="text-center text-muted no-data-message">
                                        No movies found
                                    </td>
                                </tr>
                            )}

                            {movies.map(movie => (
                                <tr key={movie.id}>
                                    <td>{movie.id}</td>
                                    <td>
                                        {movie.posterUrl && (
                                            <img
                                                src={movie.posterUrl}
                                                className="movie-poster-thumb"
                                                alt=""
                                            />
                                        )}
                                    </td>
                                    <td className="movie-title">{movie.title}</td>
                                    <td>{movie.genres?.map(g => g.name).join(', ') || 'N/A'}</td>
                                    <td>{movie.durationMinutes} min</td>
                                    <td>{movie.ageRating}</td>
                                    <td>
                                        <span className={`badge-custom ${movie.status === 'NOW_SHOWING' ? 'badge-success' : 'badge-secondary'}`}>
                                            {movie.status === 'NOW_SHOWING' ? 'Showing' : movie.status === 'COMING_SOON' ? 'Coming Soon' : 'Stopped'}
                                        </span>
                                    </td>
                                    <td>{movie.releaseDate}</td>
                                    <td>{movie.endDate || 'N/A'}</td>
                                    <td>
                                        {movie.trailerUrl
                                            ? <a href={movie.trailerUrl} target="_blank" rel="noreferrer" className="trailer-link">View</a>
                                            : 'N/A'}
                                    </td>
                                    <td className="movie-actions">
                                        <button className="btn-custom btn-warning btn-sm" onClick={() => openModal(movie)}>
                                            <FaEdit />
                                        </button>
                                        <button className="btn-custom btn-danger btn-sm" onClick={() => handleDelete(movie.id)}>
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* MODAL */}
                {showModal && (
                    <div className="custom-modal-backdrop" onClick={closeModal}>
                        <div className="custom-modal-panel movie-modal" onClick={e => e.stopPropagation()}>
                            <div className="custom-modal-header">
                                <h3>{isEditing ? 'Edit Movie' : 'Add Movie'}</h3>
                                <button className="modal-close-btn" type="button" onClick={closeModal}>✕</button>
                            </div>
                            
                            <form onSubmit={handleSave}>
                                <div className="custom-modal-body">
                                    <div className="form-row">
                                        <div className="form-col" style={{ flex: 2 }}>
                                            <div className="form-group-custom">
                                                <label>Title</label>
                                                <input className="form-control-custom" name="title" value={currentMovie.title} onChange={handleChange} required />
                                            </div>
                                        </div>
                                        <div className="form-col">
                                            <div className="form-group-custom">
                                                <label>Genre</label>
                                                <select className="form-control-custom" name="genreId" value={currentMovie.genreId} onChange={handleChange} required>
                                                    <option value="">Select</option>
                                                    {genres.map(g => (
                                                        <option key={g.id} value={g.id}>{g.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group-custom mt-3">
                                        <label>Description</label>
                                        <textarea
                                            className="form-control-custom"
                                            rows="3"
                                            name="description"
                                            value={currentMovie.description}
                                            onChange={handleChange}
                                        ></textarea>
                                    </div>

                                    <div className="form-row mt-3">
                                        <div className="form-col">
                                            <div className="form-group-custom">
                                                <label>Duration (min)</label>
                                                <input className="form-control-custom" type="number" name="duration" value={currentMovie.duration} onChange={handleChange} />
                                            </div>
                                        </div>
                                        <div className="form-col">
                                            <div className="form-group-custom">
                                                <label>Age Rating</label>
                                                <select className="form-control-custom" name="ageRating" value={currentMovie.ageRating} onChange={handleChange}>
                                                    <option value="ALL_AGE">All Age</option>
                                                    <option value="16+">16+</option>
                                                    <option value="18+">18+</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-row mt-3">
                                        <div className="form-col">
                                            <div className="form-group-custom">
                                                <label>Release Date</label>
                                                <input className="form-control-custom" type="date" name="releaseDate" value={currentMovie.releaseDate} onChange={handleChange} />
                                            </div>
                                        </div>
                                        <div className="form-col">
                                            <div className="form-group-custom">
                                                <label>End Date</label>
                                                <input
                                                    className="form-control-custom"
                                                    type="date"
                                                    name="endDate"
                                                    value={currentMovie.endDate}
                                                    onChange={handleChange}
                                                    min={currentMovie.releaseDate ? new Date(new Date(currentMovie.releaseDate).getTime() + 86400000).toISOString().split('T')[0] : ''}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-row mt-3">
                                        <div className="form-col">
                                            <div className="form-group-custom">
                                                <label>Poster Image</label>
                                                <input className="form-control-custom" type="file" name="poster" accept="image/*" onChange={handleChange} />
                                            </div>
                                        </div>
                                        <div className="form-col">
                                            <div className="form-group-custom">
                                                <label>Trailer Video</label>
                                                <input className="form-control-custom" type="file" name="trailer" accept="video/*" onChange={handleChange} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="custom-modal-footer">
                                    <button type="button" className="btn-custom btn-secondary" onClick={closeModal}>Cancel</button>
                                    <button type="submit" className="btn-custom btn-primary" disabled={loading}>
                                        {isEditing ? 'Update Movie' : 'Create Movie'}
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

export default AdminMovies;
