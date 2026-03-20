import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MoviesPage.css';
import MovieCard from '../Home/components/MovieCard/MovieCard';
import movieApi from '../../api/movieApi';

const MoviesPage = () => {
    const navigate = useNavigate();

    // Filters state
    const [status, setStatus] = useState('NOW_SHOWING'); // 'NOW_SHOWING' | 'COMING_SOON' | null (for all)
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenreId, setSelectedGenreId] = useState(null);

    // Data state
    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch Genres on Mount
    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const data = await movieApi.getAllGenres();
                setGenres(data);
            } catch (error) {
                console.error("Failed to fetch genres:", error);
            }
        };
        fetchGenres();
    }, []);

    // Fetch Movies when filters change including debounced search
    useEffect(() => {
        const fetchMovies = async () => {
            setLoading(true);
            try {
                // Prepare params
                const params = {};
                if (status) params.status = status;
                if (searchQuery) params.query = searchQuery;
                if (selectedGenreId) params.genreId = selectedGenreId;

                const data = await movieApi.searchMovies(params);
                setMovies(data);
            } catch (error) {
                console.error("Failed to fetch movies:", error);
            } finally {
                setLoading(false);
            }
        };

        // Debounce search query
        const timer = setTimeout(() => {
            fetchMovies();
        }, 300);

        return () => clearTimeout(timer);
    }, [status, searchQuery, selectedGenreId]);

    return (
        <div className="movies-page-container">
            {/* Sidebar Filter */}
            <aside className="movies-sidebar">

                {/* Search Bar */}
                <h3>Tìm Kiếm</h3>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Nhập tên phim..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                {/* Status Filter */}
                <h3>Trạng Thái</h3>
                <div className="filter-group">
                    <button
                        className={`filter-btn ${status === 'NOW_SHOWING' ? 'active' : ''}`}
                        onClick={() => setStatus('NOW_SHOWING')}
                    >
                        Đang Chiếu
                    </button>
                    <button
                        className={`filter-btn ${status === 'COMING_SOON' ? 'active' : ''}`}
                        onClick={() => setStatus('COMING_SOON')}
                    >
                        Sắp Chiếu
                    </button>
                    <button
                        className={`filter-btn ${status === null ? 'active' : ''}`}
                        onClick={() => setStatus(null)}
                    >
                        Tất Cả
                    </button>
                </div>

                {/* Genre Filter */}
                <h3>Thể Loại</h3>
                <div className="genre-filter-list">
                    <div
                        className={`genre-item ${selectedGenreId === null ? 'active' : ''}`}
                        onClick={() => setSelectedGenreId(null)}
                    >
                        Tất cả thể loại
                    </div>
                    {genres.map(genre => (
                        <div
                            key={genre.id}
                            className={`genre-item ${selectedGenreId === genre.id ? 'active' : ''}`}
                            onClick={() => setSelectedGenreId(genre.id)}
                        >
                            {genre.name}
                        </div>
                    ))}
                </div>

            </aside>

            {/* Main Content */}
            <main className="movies-content">
                <header className="page-header">
                    <h1 className="page-title">
                        {status === 'NOW_SHOWING' ? 'Phim Đang Chiếu' :
                            status === 'COMING_SOON' ? 'Phim Sắp Chiếu' : 'Danh Sách Phim'}
                    </h1>
                    <p className="page-subtitle">
                        {searchQuery ? `Kết quả tìm kiếm cho "${searchQuery}"` :
                            selectedGenreId ? `Lọc theo thể loại` :
                                'Khám phá thế giới điện ảnh đa sắc màu.'}
                    </p>
                </header>

                {loading ? (
                    <div className="loading-container">Đang tải phim...</div>
                ) : (
                    <div className="movies-grid">
                        {movies.length > 0 ? (
                            movies.map((movie) => (
                                <MovieCard
                                    key={movie.id}
                                    title={movie.title}
                                    age={movie.ageRating}
                                    posterUrl={movie.posterUrl}
                                    status={movie.status}
                                    onBuy={() => navigate(`/booking/movies/${movie.id}`)}
                                    // Make sure navigation works
                                    onClick={() => navigate(`/movies/${movie.id}`)}
                                />
                            ))
                        ) : (
                            <div style={{ color: '#b3b3b3', gridColumn: '1/-1', textAlign: 'center', marginTop: '40px' }}>
                                Không tìm thấy phim nào phù hợp với tiêu chí tìm kiếm.
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default MoviesPage;
