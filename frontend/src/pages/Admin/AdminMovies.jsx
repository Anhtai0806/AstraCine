import React, { useState, useEffect, useRef, useMemo } from 'react';
import { movieAPI, genreAPI } from '../../api/adminApi';
import { FaEdit, FaTrash, FaPlus, FaSearch } from 'react-icons/fa';
import './AdminMovies.css';

const emptyMovie = {
    title: '',
    description: '',
    duration: '',
    priority: '',
    releaseDate: '',
    endDate: '',
    ageRating: 'P',
    status: 'NOW_SHOWING',
    genreIds: [],
    poster: null,
    trailer: null
};

const getTodayDateString = () => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offsetMs).toISOString().split('T')[0];
};

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_POSTER_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const ALLOWED_TRAILER_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi'];
const STATUS_DISPLAY_ORDER = {
    NOW_SHOWING: 0,
    COMING_SOON: 1,
    STOPPED: 2
};

const getFileNameFromUrl = (url) => {
    if (!url) return '';

    try {
        const cleanedUrl = url.split('?')[0].split('#')[0];
        return decodeURIComponent(cleanedUrl.substring(cleanedUrl.lastIndexOf('/') + 1)) || cleanedUrl;
    } catch {
        return url;
    }
};

const AdminMovies = () => {
    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentMovie, setCurrentMovie] = useState(emptyMovie);
    const [fileErrors, setFileErrors] = useState({ poster: '', trailer: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const genreRequiredRef = useRef(null);
    const durationInputRef = useRef(null);
    const priorityInputRef = useRef(null);
    const posterInputRef = useRef(null);
    const trailerInputRef = useRef(null);
    const today = getTodayDateString();

    useEffect(() => {
        fetchMovies();
        fetchGenres();
    }, []);

    useEffect(() => {
        if (genreRequiredRef.current) {
            genreRequiredRef.current.setCustomValidity('');
        }
    }, [currentMovie.genreIds]);

    useEffect(() => {
        if (durationInputRef.current) {
            durationInputRef.current.setCustomValidity('');
        }
    }, [currentMovie.duration]);

    useEffect(() => {
        if (priorityInputRef.current) {
            priorityInputRef.current.setCustomValidity('');
        }
    }, [currentMovie.priority]);

    const fetchMovies = async () => {
        try {
            setLoading(true);
            const res = await movieAPI.getAll();
            setMovies(res.data);
        } catch {
            setError('Không thể tải danh sách phim.');
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
            setError('Tìm kiếm thất bại.');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (movie = null) => {
        if (movie) {
            setCurrentMovie({
                ...movie,
                duration: movie.durationMinutes || '',
                priority: movie.priority || '',
                releaseDate: movie.releaseDate?.slice(0, 10) || '',
                endDate: movie.endDate?.slice(0, 10) || '',
                ageRating: movie.ageRating || 'P',
                genreIds: (movie.genres || []).map((g) => String(g.id)),
                poster: null,
                trailer: null
            });
            setFileErrors({ poster: '', trailer: '' });
            setIsEditing(true);
        } else {
            setCurrentMovie(emptyMovie);
            setFileErrors({ poster: '', trailer: '' });
            setIsEditing(false);
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setCurrentMovie(emptyMovie);
        setFileErrors({ poster: '', trailer: '' });
        setError(null);
    };

    const calculateStatus = (release, end) => {
        if (!release) return 'COMING_SOON';
        const todayDate = getTodayDateString();

        if (release > todayDate) return 'COMING_SOON';
        if (end && end < todayDate) return 'STOPPED';
        return 'NOW_SHOWING';
    };

    const toggleGenre = (genreId) => {
        const genreIdStr = String(genreId);
        setCurrentMovie((prev) => {
            const hasGenre = prev.genreIds.includes(genreIdStr);
            return {
                ...prev,
                genreIds: hasGenre
                    ? prev.genreIds.filter((id) => id !== genreIdStr)
                    : [...prev.genreIds, genreIdStr]
            };
        });
    };

    const selectAllGenres = () => {
        setCurrentMovie((prev) => ({
            ...prev,
            genreIds: genres.map((g) => String(g.id))
        }));
    };

    const clearAllGenres = () => {
        setCurrentMovie((prev) => ({
            ...prev,
            genreIds: []
        }));
    };

    const handleChange = (e) => {
        const { name, value, files } = e.target;

        if (files) {
            const selectedFile = files[0];
            const allowedExtensions = name === 'poster' ? ALLOWED_POSTER_EXTENSIONS : ALLOWED_TRAILER_EXTENSIONS;
            const inputRef = name === 'poster' ? posterInputRef : trailerInputRef;

            if (!selectedFile) {
                setFileErrors((prev) => ({ ...prev, [name]: '' }));
                setCurrentMovie((prev) => ({ ...prev, [name]: null }));
                return;
            }

            const fileName = selectedFile.name || '';
            const fileExtension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';

            if (!allowedExtensions.includes(fileExtension)) {
                if (inputRef.current) {
                    inputRef.current.value = '';
                }
                setFileErrors((prev) => ({
                    ...prev,
                    [name]: `Định dạng tệp không hợp lệ. Chỉ chấp nhận: ${allowedExtensions.join(', ')}`
                }));
                setCurrentMovie((prev) => ({ ...prev, [name]: null }));
                return;
            }

            if (selectedFile.size > MAX_UPLOAD_SIZE_BYTES) {
                if (inputRef.current) {
                    inputRef.current.value = '';
                }
                setFileErrors((prev) => ({ ...prev, [name]: 'Kích thước tệp vượt quá 10MB.' }));
                setCurrentMovie((prev) => ({ ...prev, [name]: null }));
                return;
            }

            setFileErrors((prev) => ({ ...prev, [name]: '' }));
        }

        setCurrentMovie((prev) => {
            const updated = { ...prev, [name]: files ? files[0] : value };

            if (name === 'releaseDate' && value) {
                const releaseDate = new Date(value);
                const nextDay = new Date(releaseDate);
                nextDay.setDate(releaseDate.getDate() + 1);
                const nextDayStr = nextDay.toISOString().split('T')[0];

                if (!updated.endDate || updated.endDate <= value) {
                    updated.endDate = nextDayStr;
                }
            }

            if (name === 'releaseDate' || name === 'endDate') {
                updated.status = calculateStatus(updated.releaseDate, updated.endDate);
            }

            return updated;
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const handleSave = async (e) => {
        e.preventDefault();

        const durationValue = Number(currentMovie.duration);
        const priorityValue = Number(currentMovie.priority);

        if (durationInputRef.current) {
            if (!currentMovie.duration) {
                durationInputRef.current.setCustomValidity('Vui lòng nhập thời lượng phim.');
                durationInputRef.current.reportValidity();
                return;
            }

            if (!Number.isFinite(durationValue) || durationValue <= 0) {
                durationInputRef.current.setCustomValidity('Thời lượng phim phải lớn hơn 0.');
                durationInputRef.current.reportValidity();
                return;
            }

            durationInputRef.current.setCustomValidity('');
        }

        if (priorityInputRef.current) {
            if (!currentMovie.priority) {
                priorityInputRef.current.setCustomValidity('Vui lòng nhập độ ưu tiên.');
                priorityInputRef.current.reportValidity();
                return;
            }

            if (!Number.isInteger(priorityValue) || priorityValue < 1 || priorityValue > 5) {
                priorityInputRef.current.setCustomValidity('Độ ưu tiên phải là số tự nhiên từ 1 đến 5.');
                priorityInputRef.current.reportValidity();
                return;
            }

            priorityInputRef.current.setCustomValidity('');
        }

        if (!currentMovie.releaseDate || !currentMovie.endDate) {
            setError('Ngày khởi chiếu và ngày kết thúc là bắt buộc.');
            return;
        }

        if (!isEditing && currentMovie.releaseDate < today) {
            setError('Ngày khởi chiếu không được nhỏ hơn ngày hiện tại.');
            return;
        }

        if (new Date(currentMovie.endDate) <= new Date(currentMovie.releaseDate)) {
            setError('Ngày kết thúc phải lớn hơn ngày khởi chiếu.');
            return;
        }

        if (!currentMovie.genreIds.length) {
            if (genreRequiredRef.current) {
                genreRequiredRef.current.setCustomValidity('Vui lòng chọn thể loại.');
                genreRequiredRef.current.reportValidity();
            }
            return;
        }

        if (genreRequiredRef.current) {
            genreRequiredRef.current.setCustomValidity('');
        }

        const formData = new FormData();
        formData.append('title', currentMovie.title);
        formData.append('description', currentMovie.description);
        formData.append('durationMinutes', currentMovie.duration);
        formData.append('priority', currentMovie.priority);
        formData.append('releaseDate', currentMovie.releaseDate);
        formData.append('endDate', currentMovie.endDate);
        formData.append('ageRating', currentMovie.ageRating);
        formData.append('status', currentMovie.status);
        currentMovie.genreIds.forEach((genreId) => formData.append('genreIds', genreId));

        if (currentMovie.poster) formData.append('poster', currentMovie.poster);
        if (currentMovie.trailer) formData.append('trailer', currentMovie.trailer);

        try {
            setLoading(true);
            if (isEditing) {
                await movieAPI.update(currentMovie.id, formData);
            } else {
                await movieAPI.create(formData);
            }

            closeModal();
            fetchMovies();
        } catch {
            setError('Không thể lưu phim.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc muốn xóa phim này không?')) return;
        try {
            await movieAPI.delete(id);
            fetchMovies();
        } catch {
            setError('Xoá phim thất bại.');
        }
    };

    const sortedMovies = useMemo(() => {
        return [...movies].sort((a, b) => {
            const orderA = STATUS_DISPLAY_ORDER[a.status] ?? Number.MAX_SAFE_INTEGER;
            const orderB = STATUS_DISPLAY_ORDER[b.status] ?? Number.MAX_SAFE_INTEGER;
            return orderA - orderB;
        });
    }, [movies]);
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
                <div className="admin-movies-header">
                    <h2>Quản Lý Phim</h2>
                    <button className="btn-custom btn-primary btn-add-movie" onClick={() => openModal()}>
                        <FaPlus className="me-2" /> Thêm phim
                    </button>
                </div>

                <form onSubmit={handleSearch} className="search-section">
                    <div className="form-row align-items-center mb-0">
                        <div className="form-col" style={{ flex: 2 }}>
                            <input
                                className="form-control-custom"
                                placeholder="Tìm theo tên phim..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="form-col">
                            <button type="submit" className="btn-custom btn-primary btn-search w-100">
                                <FaSearch className="me-2" /> Tìm Kiếm
                            </button>
                        </div>
                    </div>
                </form>

                {error && (
                    <div className="alert-custom alert-danger">
                        <span>{error}</span>
                        <button className="alert-close" onClick={() => setError(null)}>x</button>
                    </div>
                )}

                <div className="movies-table table-responsive">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Poster</th>
                                <th>Tên phim</th>
                                <th>Thể loại</th>
                                <th>Thời lượng</th>
                                <th>Độ ưu tiên</th>
                                <th>Độ tuổi</th>
                                <th>Trạng thái</th>
                                <th>Khởi chiếu</th>
                                <th>Kết thúc</th>
                                <th>Trailer</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movies.length === 0 && (
                                <tr>
                                    <td colSpan="12" className="text-center text-muted no-data-message">
                                        Không có phim nào
                                    </td>
                                </tr>
                            )}

                            {sortedMovies.map((movie) => (
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
                                    <td>{movie.genres?.map((g) => g.name).join(', ')}</td>
                                    <td>{movie.durationMinutes} phút</td>
                                    <td>{movie.priority}</td>
                                    <td>{movie.ageRating}</td>
                                    <td>
                                        <span className={`badge-custom ${movie.status === 'NOW_SHOWING' ? 'badge-success' : movie.status === 'COMING_SOON' ? 'badge-warning' : 'badge-secondary'}`}>
                                            {movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : movie.status === 'COMING_SOON' ? 'Sắp chiếu' : 'Ngừng chiếu'}
                                        </span>
                                    </td>
                                    <td>{formatDate(movie.releaseDate)}</td>
                                    <td>{formatDate(movie.endDate)}</td>
                                    <td>
                                        {movie.trailerUrl
                                            ? <a href={movie.trailerUrl} target="_blank" rel="noreferrer" className="trailer-link">Xem</a>
                                            : 'Chưa có'}
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

                {showModal && (
                    <div className="custom-modal-backdrop" onClick={closeModal}>
                        <div className="custom-modal-panel movie-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="custom-modal-header">
                                <h3>{isEditing ? 'Chỉnh sửa phim' : 'Thêm phim'}</h3>
                                <button className="modal-close-btn" type="button" onClick={closeModal}>x</button>
                            </div>

                            <form onSubmit={handleSave}>
                                <div className="custom-modal-body">
                                    <div className="form-row">
                                        <div className="form-col">
                                            <div className="form-group-custom">
                                                <label>Tên phim</label>
                                                <input className="form-control-custom" name="title" value={currentMovie.title} onChange={handleChange} required />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group-custom mt-3 genre-field-wrapper">
                                        <div className="genre-header">
                                            <label>Thể loại ({currentMovie.genreIds.length} đã chọn)</label>
                                            <div className="genre-actions-inline">
                                                <button type="button" className="btn-link-inline" onClick={selectAllGenres}>Chọn tất cả</button>
                                                <button type="button" className="btn-link-inline" onClick={clearAllGenres}>Bỏ chọn</button>
                                            </div>
                                        </div>
                                        <div className="genre-checkbox-list">
                                            <input
                                                ref={genreRequiredRef}
                                                className="genre-validation-proxy"
                                                tabIndex={-1}
                                                value={currentMovie.genreIds.join(',')}
                                                onChange={() => { }}
                                                onInvalid={(e) => e.target.setCustomValidity('Vui lòng chọn thể loại.')}
                                                required
                                            />
                                            {genres.map((g) => {
                                                const checked = currentMovie.genreIds.includes(String(g.id));
                                                return (
                                                    <label key={g.id} className={`genre-chip ${checked ? 'active' : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => toggleGenre(g.id)}
                                                        />
                                                        <span>{g.name}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="form-group-custom mt-3">
                                        <label>Mô tả</label>
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
                                                <label>Thời lượng (phút)</label>
                                                <input
                                                    ref={durationInputRef}
                                                    className="form-control-custom"
                                                    type="number"
                                                    name="duration"
                                                    min="1"
                                                    value={currentMovie.duration}
                                                    onChange={handleChange}
                                                    onInvalid={(e) => {
                                                        if (!e.target.value) {
                                                            e.target.setCustomValidity('Vui lòng nhập thời lượng phim.');
                                                            return;
                                                        }

                                                        if (Number(e.target.value) <= 0) {
                                                            e.target.setCustomValidity('Thời lượng phim phải lớn hơn 0.');
                                                            return;
                                                        }

                                                        e.target.setCustomValidity('Thời lượng phim không hợp lệ.');
                                                    }}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="form-col">
                                            <div className="form-group-custom">
                                                <label>Độ ưu tiên</label>
                                                <input
                                                    ref={priorityInputRef}
                                                    className="form-control-custom"
                                                    type="number"
                                                    name="priority"
                                                    min="1"
                                                    max="5"
                                                    step="1"
                                                    value={currentMovie.priority}
                                                    onChange={handleChange}
                                                    onInvalid={(e) => {
                                                        if (!e.target.value) {
                                                            e.target.setCustomValidity('Vui lòng nhập độ ưu tiên.');
                                                            return;
                                                        }

                                                        if (!Number.isInteger(Number(e.target.value)) || Number(e.target.value) < 1 || Number(e.target.value) > 5) {
                                                            e.target.setCustomValidity('Độ ưu tiên phải là số tự nhiên từ 1 đến 5.');
                                                            return;
                                                        }

                                                        e.target.setCustomValidity('Độ ưu tiên không hợp lệ.');
                                                    }}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="form-col">
                                            <div className="form-group-custom">
                                                <label>Độ tuổi</label>
                                                <select className="form-control-custom" name="ageRating" value={currentMovie.ageRating} onChange={handleChange}>
                                                    <option value="P">P</option>
                                                    <option value="16+">16+</option>
                                                    <option value="18+">18+</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-row mt-3">
                                        <div className="form-col">
                                            <div className="form-group-custom">
                                                <label>Ngày khởi chiếu</label>
                                                <input
                                                    className="form-control-custom"
                                                    type="date"
                                                    name="releaseDate"
                                                    value={currentMovie.releaseDate}
                                                    onChange={handleChange}
                                                    min={isEditing ? '' : today}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="form-col">
                                            <div className="form-group-custom">
                                                <label>Ngày kết thúc</label>
                                                <input
                                                    className="form-control-custom"
                                                    type="date"
                                                    name="endDate"
                                                    value={currentMovie.endDate}
                                                    onChange={handleChange}
                                                    min={currentMovie.releaseDate ? new Date(new Date(currentMovie.releaseDate).getTime() + 86400000).toISOString().split('T')[0] : ''}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-row mt-3">
                                        <div className="form-col">
                                            <div className="form-group-custom">
                                                <label>Poster</label>
                                                <input
                                                    ref={posterInputRef}
                                                    className="form-control-custom"
                                                    type="file"
                                                    name="poster"
                                                    accept=".jpg,.jpeg,.png,.webp,image/*"
                                                    onChange={handleChange}
                                                />
                                                {fileErrors.poster && (
                                                    <small className="field-error-text">{fileErrors.poster}</small>
                                                )}
                                                {currentMovie.poster ? (
                                                    <small className="current-file-note">
                                                        File mới: {currentMovie.poster.name}
                                                    </small>
                                                ) : (
                                                    isEditing && currentMovie.posterUrl && (
                                                        <div className="existing-file-wrapper">
                                                            <small className="current-file-note">
                                                                Poster hiện tại: {getFileNameFromUrl(currentMovie.posterUrl)}
                                                            </small>
                                                            <img
                                                                src={currentMovie.posterUrl}
                                                                alt="Poster hiện tại"
                                                                className="current-poster-preview"
                                                            />
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                        <div className="form-col">
                                            <div className="form-group-custom">
                                                <label>Trailer</label>
                                                <input
                                                    ref={trailerInputRef}
                                                    className="form-control-custom"
                                                    type="file"
                                                    name="trailer"
                                                    accept=".mp4,.webm,.mov,.avi,video/*"
                                                    onChange={handleChange}
                                                />
                                                {fileErrors.trailer && (
                                                    <small className="field-error-text">{fileErrors.trailer}</small>
                                                )}
                                                {currentMovie.trailer ? (
                                                    <small className="current-file-note">
                                                        File mới: {currentMovie.trailer.name}
                                                    </small>
                                                ) : (
                                                    isEditing && currentMovie.trailerUrl && (
                                                        <small className="current-file-note">
                                                            Trailer hiện tại: {getFileNameFromUrl(currentMovie.trailerUrl)} (
                                                            <a href={currentMovie.trailerUrl} target="_blank" rel="noreferrer">
                                                                mở file
                                                            </a>
                                                            )
                                                        </small>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="custom-modal-footer">
                                    <button type="button" className="btn-custom btn-secondary" onClick={closeModal}>Hủy</button>
                                    <button type="submit" className="btn-custom btn-primary" disabled={loading}>
                                        {isEditing ? 'Cập nhật phim' : 'Tạo phim'}
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




