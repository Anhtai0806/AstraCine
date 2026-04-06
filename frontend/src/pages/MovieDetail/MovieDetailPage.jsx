import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import movieApi from '../../api/movieApi';
import './MovieDetail.css';

const getMovieDuration = (movie) => {
    const duration = movie?.durationMinutes ?? movie?.duration ?? 0;
    const parsedDuration = Number(duration);
    return Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 0;
};

const MovieDetailPage = () => {
    const { movieId } = useParams();
    const navigate = useNavigate();
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMovieDetail = async () => {
            try {
                const data = await movieApi.getMovieById(movieId);
                setMovie(data);
            } catch (error) {
                console.error("Failed to fetch movie detail:", error);
            } finally {
                setLoading(false);
            }
        };

        if (movieId) {
            fetchMovieDetail();
        }
    }, [movieId]);

    if (loading) {
        return <div className="loading-container" style={{ height: '100vh' }}>Đang tải thông tin phim...</div>;
    }

    if (!movie) {
        return <div className="error-container" style={{ color: 'white', textAlign: 'center', marginTop: '100px' }}>Không tìm thấy phim.</div>;
    }

    // Determine banner image (use distinct banner if available, else fallback to poster or placeholder)
    // Assuming backend might send 'bannerUrl' or we reuse 'posterUrl'
    const bannerImage = movie.posterUrl || 'https://via.placeholder.com/1920x1080?text=No+Image';

    // Format duration
    const formatDuration = (mins) => {
        const safeMinutes = Number(mins) || 0;
        const h = Math.floor(safeMinutes / 60);
        const m = safeMinutes % 60;
        return `${h}h ${m}m`;
    };

    // Format Date
    const formatDate = (dateString) => {
        if (!dateString) return 'Đang cập nhật';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    return (
        <div className="movie-detail-container">
            {/* 1. Banner Section */}
            <div className="movie-banner-section" style={{ backgroundImage: `url(${bannerImage})` }}>
                <div className="movie-banner-overlay">
                    <div className="movie-banner-content">
                        {/* Poster */}
                        <div className="movie-poster-large">
                            <img src={movie.posterUrl} alt={movie.title} />
                        </div>

                        {/* Heading Info */}
                        <div className="movie-info-header">
                            <h1 className="movie-title-large">{movie.title}</h1>

                            <div className="movie-meta">
                                <span className="movie-age-tag">{movie.ageRating || 'P'}</span>
                                <span className="movie-duration">
                                    <i className="fas fa-clock"></i> {formatDuration(getMovieDuration(movie))}
                                </span>
                                <span className="movie-release-date">
                                    <i className="fas fa-calendar-alt"></i> {formatDate(movie.releaseDate)}
                                </span>
                            </div>

                            <div className="movie-genres">
                                {movie.genres && movie.genres.map((g, index) => (
                                    <span key={index} className="genre-tag">{typeof g === 'object' ? g.name : g}</span>
                                ))}
                            </div>

                            <div className="movie-actions">
                                <button className="btn-book-ticket" onClick={() => navigate(`/booking/movies/${movie.id}`)}>
                                    Mua Vé Ngay
                                </button>
                                <button className="btn-trailer" onClick={() => {
                                    const trailerSection = document.getElementById('trailer-section');
                                    if (trailerSection) trailerSection.scrollIntoView({ behavior: 'smooth' });
                                }}>
                                    <span>▶</span> Xem Trailer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Main Content Grid */}
            <div className="movie-detail-content">
                {/* Left Column: Plot, Cast, Trailer */}
                <div className="detail-left-col">
                    <section className="movie-plot">
                        <h2 className="section-heading">Nội Dung Phim</h2>
                        <p>{movie.description || "Đang cập nhật nội dung..."}</p>
                    </section>

                    <section className="movie-cast">
                        <h2 className="section-heading">Đạo Diễn & Diễn Viên</h2>
                        <div className="movie-crew-grid">
                            <div className="crew-item">
                                <div className="crew-role">Đạo diễn</div>
                                <div className="crew-name">{movie.director || "Đang cập nhật"}</div>
                            </div>
                            {/* If actors is an array */}
                            {movie.actors && (
                                <div className="crew-item">
                                    <div className="crew-role">Diễn viên</div>
                                    <div className="crew-name">{movie.actors}</div>
                                </div>
                            )}
                        </div>
                    </section>

                    <section id="trailer-section" className="video-section">
                        <h2 className="section-heading">Trailer</h2>
                        {movie.trailerUrl ? (
                            <iframe
                                src={movie.trailerUrl.replace("watch?v=", "embed/")}
                                title="Trailer"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <p style={{ color: '#999' }}>Chưa có trailer.</p>
                        )}
                    </section>
                </div>

                {/* Right Column: Info Details */}
                <div className="detail-right-col">
                    <div className="info-row">
                        <span className="info-label">Khởi Chiếu</span>
                        <span className="info-value">{formatDate(movie.releaseDate)}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Ngôn Ngữ</span>
                        <span className="info-value">{movie.language || "Phụ đề Tiếng Việt"}</span>
                    </div>
                    {/* Add more info fields if available in DB */}
                </div>
            </div>
        </div>
    );
};

export default MovieDetailPage;
