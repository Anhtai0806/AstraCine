import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap';
import { movieAPI, genreAPI } from '../../api/adminApi';
import { FaEdit, FaTrash, FaPlus, FaSearch } from 'react-icons/fa';
import './AdminMovies.css';

const AdminMovies = () => {
    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [currentMovie, setCurrentMovie] = useState({
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
    });
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchMovies();
        fetchGenres();
    }, []);

    const fetchMovies = async (status = '') => {
        try {
            setLoading(true);
            const response = await movieAPI.getAll(status);
            setMovies(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch movies.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchGenres = async () => {
        try {
            const response = await genreAPI.getAll();
            setGenres(response.data);
        } catch (err) {
            console.error('Failed to fetch genres for selection.', err);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            if (searchTerm.trim()) {
                const response = await movieAPI.search(searchTerm);
                setMovies(response.data);
            } else {
                fetchMovies();
            }
        } catch (err) {
            setError('Search failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleShowModal = (movie = null) => {
        if (movie) {
            // Find the primary genre ID if available (backend returns a set of genres)
            let primaryGenreId = '';
            if (movie.genres && movie.genres.length > 0) {
                primaryGenreId = movie.genres[0].id;
            } else if (movie.genre && movie.genre.id) {
                // Fallback for older structure just in case
                primaryGenreId = movie.genre.id;
            }

            setCurrentMovie({
                ...movie,
                duration: movie.durationMinutes || '', // Map durationMinutes to duration
                endDate: movie.endDate || '',
                ageRating: movie.ageRating || 'ALL_AGE',
                genreId: primaryGenreId,
                poster: null, // Reset poster file on edit, we don't re-upload unless changed
                trailer: null // Reset trailer file on edit
            });
            setIsEditing(true);
        } else {
            setCurrentMovie({
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
            });
            setIsEditing(false);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentMovie({
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
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentMovie({ ...currentMovie, [name]: value });
    };

    const handleFileChange = (e) => {
        const { name } = e.target;
        setCurrentMovie({ ...currentMovie, [name]: e.target.files[0] });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', currentMovie.title);
        formData.append('description', currentMovie.description);
        formData.append('durationMinutes', currentMovie.duration);
        formData.append('releaseDate', currentMovie.releaseDate);
        formData.append('endDate', currentMovie.endDate);
        formData.append('ageRating', currentMovie.ageRating);
        formData.append('status', currentMovie.status);
        formData.append('genreIds', currentMovie.genreId);
        if (currentMovie.poster) {
            formData.append('poster', currentMovie.poster);
        }
        if (currentMovie.trailer) {
            formData.append('trailer', currentMovie.trailer);
        }

        try {
            if (isEditing) {
                await movieAPI.update(currentMovie.id, formData);
            } else {
                await movieAPI.create(formData);
            }
            fetchMovies();
            handleCloseModal();
        } catch (err) {
            setError('Failed to save movie. Please check inputs.');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this movie?')) {
            try {
                await movieAPI.delete(id);
                fetchMovies();
            } catch (err) {
                setError('Failed to delete movie.');
            }
        }
    };

    if (loading && !movies.length) return (
        <div className="admin-movies-page">
            <div className="loading-spinner">
                <Spinner animation="border" />
            </div>
        </div>
    );

    return (
        <div className="admin-movies-page">
            <Container className="admin-movies-container">
                <div className="admin-movies-header">
                    <h2>Manage Movies</h2>
                    <Button variant="primary" className="btn-add-movie" onClick={() => handleShowModal()}>
                        <FaPlus className="me-2" /> Add Movie
                    </Button>
                </div>

                <Form onSubmit={handleSearch} className="search-section">
                    <Row>
                        <Col md={8}>
                            <Form.Control
                                type="text"
                                placeholder="Search by title..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </Col>
                        <Col md={4}>
                            <Button variant="secondary" type="submit" className="btn-search w-100">
                                <FaSearch /> Search
                            </Button>
                        </Col>
                    </Row>
                </Form>

                {error && <Alert variant="danger" className="alert-custom" dismissible onClose={() => setError(null)}>{error}</Alert>}

                <Table striped bordered hover responsive className="movies-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Poster</th>
                            <th>Title</th>
                            <th>Genre</th>
                            <th>Duration (min)</th>
                            <th>Age Rating</th>
                            <th>Status</th>
                            <th>Release Date</th>
                            <th>End Date</th>
                            <th>Trailer</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movies.map((movie) => (
                            <tr key={movie.id}>
                                <td>{movie.id}</td>
                                <td>
                                    {movie.posterUrl && (
                                        <img src={`${movie.posterUrl}`} alt={movie.title} className="movie-poster-thumb" />
                                    )}
                                </td>
                                <td className="movie-title">{movie.title}</td>
                                <td className="movie-genre">
                                    {movie.genres && movie.genres.length > 0
                                        ? movie.genres.map(g => g.name).join(', ')
                                        : 'N/A'
                                    }
                                </td>
                                <td>{movie.durationMinutes}</td>
                                <td>{movie.ageRating || 'N/A'}</td>
                                <td>
                                    <Badge className={`status-badge ${movie.status === 'NOW_SHOWING' ? 'bg-success' : 'bg-secondary'}`}>
                                        {movie.status}
                                    </Badge>
                                </td>
                                <td>{movie.releaseDate}</td>
                                <td>{movie.endDate || 'N/A'}</td>
                                <td>
                                    {movie.trailerUrl ? (
                                        <a href={movie.trailerUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-info">
                                            View
                                        </a>
                                    ) : 'N/A'}
                                </td>
                                <td>
                                    <div className="movie-actions">
                                        <Button variant="warning" size="sm" className="btn-edit-movie" onClick={() => handleShowModal(movie)}>
                                            <FaEdit />
                                        </Button>
                                        <Button variant="danger" size="sm" className="btn-delete-movie" onClick={() => handleDelete(movie.id)}>
                                            <FaTrash />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>

                <Modal show={showModal} onHide={handleCloseModal} size="lg" className="movie-modal" dialogClassName="modal-dialog-scrollable">
                    <Modal.Header closeButton>
                        <Modal.Title>{isEditing ? 'Edit Movie' : 'Add New Movie'}</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleSave}>
                        <Modal.Body>
                            {/* ===== BASIC INFO ===== */}
                            <Row>
                                <Col md={12}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Title</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="title"
                                            value={currentMovie.title}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Genre</Form.Label>
                                        <Form.Select
                                            name="genreId"
                                            value={currentMovie.genreId}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">Select Genre</option>
                                            {genres.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Duration (mins)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="duration"
                                            value={currentMovie.duration}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Form.Group className="mb-3">
                                <Form.Label>Description</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    name="description"
                                    value={currentMovie.description}
                                    onChange={handleInputChange}
                                    required
                                />
                            </Form.Group>

                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Status</Form.Label>
                                        <Form.Select
                                            name="status"
                                            value={currentMovie.status}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="NOW_SHOWING">Now Showing</option>
                                            <option value="COMING_SOON">Coming Soon</option>
                                            <option value="ENDED">Ended</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Age Rating</Form.Label>
                                        <Form.Select
                                            name="ageRating"
                                            value={currentMovie.ageRating}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="ALL_AGE">All Age</option>
                                            <option value="16+">16+</option>
                                            <option value="18+">18+</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>

                            <hr />

                            {/* ===== SCHEDULE ===== */}
                            <Row className="mb-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Release Date</Form.Label>
                                        <Form.Control
                                            type="date"
                                            name="releaseDate"
                                            value={currentMovie.releaseDate}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>End Date</Form.Label>
                                        <Form.Control
                                            type="date"
                                            name="endDate"
                                            value={currentMovie.endDate}
                                            onChange={handleInputChange}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <hr />

                            {/* ===== MEDIA ===== */}
                            <Form.Group className="mb-3">
                                <Form.Label>Poster Image</Form.Label>
                                <Form.Control
                                    type="file"
                                    name="poster"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    required={!isEditing}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Trailer Video</Form.Label>
                                <Form.Control
                                    type="file"
                                    name="trailer"
                                    onChange={handleFileChange}
                                    accept="video/*"
                                />
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleCloseModal}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit">
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
