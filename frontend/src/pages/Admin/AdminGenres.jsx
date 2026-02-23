import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
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
                <Spinner animation="border" />
            </div>
        </div>
    );

    return (
        <div className="admin-genres-page">
            <Container className="admin-genres-container">
                <div className="admin-genres-header">
                    <h2>Manage Genres</h2>
                    <Button variant="primary" className="btn-add-genre" onClick={() => handleShowModal()}>
                        <FaPlus className="me-2" /> Add Genre
                    </Button>
                </div>

                {error && <Alert variant="danger" className="alert-custom" dismissible onClose={() => setError(null)}>{error}</Alert>}

                <Table striped bordered hover responsive className="genres-table">
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
                                            <Button variant="warning" size="sm" className="btn-edit-genre" onClick={() => handleShowModal(genre)}>
                                                <FaEdit />
                                            </Button>
                                            <Button variant="danger" size="sm" className="btn-delete-genre" onClick={() => handleDelete(genre.id)}>
                                                <FaTrash />
                                            </Button>
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
                </Table>

                <Modal
                    show={showModal}
                    onHide={handleCloseModal}
                    className="genre-modal"
                    backdrop="static"
                    enforceFocus={false}
                >
                    <Modal.Header closeButton>
                        <Modal.Title>{isEditing ? 'Edit Genre' : 'Add New Genre'}</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleSave}>
                        <Modal.Body>
                            <Form.Group controlId="genreName">
                                <Form.Label>Genre Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Enter genre name"
                                    value={currentGenre.name}
                                    onChange={(e) => setCurrentGenre({ ...currentGenre, name: e.target.value })}
                                    required
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

export default AdminGenres;
