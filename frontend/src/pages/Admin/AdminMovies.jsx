import React, { useState, useEffect } from 'react';
import {
    Container, Table, Button, Modal, Form,
    Alert, Spinner, Row, Col, Badge
} from 'react-bootstrap';
import { movieAPI, genreAPI } from '../../api/adminApi';
import { FaEdit, FaTrash, FaPlus, FaSearch } from 'react-icons/fa';
import './AdminMovies.css';

const emptyMovie = {
    title: '',
    description: '',
    duration: '',
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
            <div className="loading-spinner">
                <Spinner animation="border" />
            </div>
        );
    }

    return (
        <div className="admin-movies-page">
            <Container className="admin-movies-container">

                {/* HEADER */}
                <div className="admin-movies-header">
                    <h2>Manage Movies</h2>
                    <Button className="btn-add-movie" onClick={() => openModal()}>
                        <FaPlus /> Add Movie
                    </Button>
                </div>

                {/* SEARCH */}
                <Form onSubmit={handleSearch} className="search-section">
                    <Row className="g-2">
                        <Col md={8}>
                            <Form.Control
                                placeholder="Search by title..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </Col>
                        <Col md={4}>
                            <Button type="submit" className="btn-search w-100">
                                <FaSearch /> Search
                            </Button>
                        </Col>
                    </Row>
                </Form>

                {error && (
                    <Alert variant="danger" onClose={() => setError(null)} dismissible>
                        {error}
                    </Alert>
                )}

                {/* TABLE */}
                <div className="movies-table">
                    <Table hover bordered>
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
                                    <td colSpan="11" className="text-center text-muted">
                                        No movies found 🎬
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
                                    <td>{movie.durationMinutes}</td>
                                    <td>{movie.ageRating}</td>
                                    <td>
                                        <Badge bg={movie.status === 'NOW_SHOWING' ? 'success' : 'secondary'}>
                                            {movie.status}
                                        </Badge>
                                    </td>
                                    <td>{movie.releaseDate}</td>
                                    <td>{movie.endDate || 'N/A'}</td>
                                    <td>
                                        {movie.trailerUrl
                                            ? <a href={movie.trailerUrl} target="_blank" rel="noreferrer">View</a>
                                            : 'N/A'}
                                    </td>
                                    <td className="movie-actions">
                                        <Button size="sm" onClick={() => openModal(movie)}>
                                            <FaEdit />
                                        </Button>
                                        <Button size="sm" variant="danger" onClick={() => handleDelete(movie.id)}>
                                            <FaTrash />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>

                {/* MODAL */}
                <Modal show={showModal} onHide={closeModal} centered size="xl">
                    <Form onSubmit={handleSave}>
                        <Modal.Header closeButton>
                            <Modal.Title>{isEditing ? 'Edit Movie' : 'Add Movie'}</Modal.Title>
                        </Modal.Header>

                        <Modal.Body>
                            <Row className="g-3">
                                <Col md={8}>
                                    <Form.Group>
                                        <Form.Label>Title</Form.Label>
                                        <Form.Control name="title" value={currentMovie.title} onChange={handleChange} required />
                                    </Form.Group>
                                </Col>

                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Genre</Form.Label>
                                        <Form.Select name="genreId" value={currentMovie.genreId} onChange={handleChange} required>
                                            <option value="">Select</option>
                                            {genres.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>

                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label>Description</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            name="description"
                                            value={currentMovie.description}
                                            onChange={handleChange}
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Duration (min)</Form.Label>
                                        <Form.Control type="number" name="duration" value={currentMovie.duration} onChange={handleChange} />
                                    </Form.Group>
                                </Col>

                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Age Rating</Form.Label>
                                        <Form.Select name="ageRating" value={currentMovie.ageRating} onChange={handleChange}>
                                            <option value="ALL_AGE">All Age</option>
                                            <option value="16+">16+</option>
                                            <option value="18+">18+</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>

                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Release Date</Form.Label>
                                        <Form.Control type="date" name="releaseDate" value={currentMovie.releaseDate} onChange={handleChange} />
                                    </Form.Group>
                                </Col>

                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>End Date</Form.Label>
                                        <Form.Control
                                            type="date"
                                            name="endDate"
                                            value={currentMovie.endDate}
                                            onChange={handleChange}
                                            min={currentMovie.releaseDate ? new Date(new Date(currentMovie.releaseDate).getTime() + 86400000).toISOString().split('T')[0] : ''}
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Poster</Form.Label>
                                        <Form.Control type="file" name="poster" accept="image/*" onChange={handleChange} />
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Trailer</Form.Label>
                                        <Form.Control type="file" name="trailer" accept="video/*" onChange={handleChange} />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Modal.Body>

                        <Modal.Footer>
                            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                            <Button type="submit" disabled={loading}>
                                {isEditing ? 'Update' : 'Create'}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>

            </Container>
        </div>
    );
};

export default AdminMovies;
