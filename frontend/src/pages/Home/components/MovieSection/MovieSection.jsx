import "./MovieSection.css";
import MovieCard from "../MovieCard/MovieCard";
import { useNavigate } from "react-router-dom";

function MovieSection({ title, type, movies = [] }) {
  const navigate = useNavigate();
  return (
    <section className={`movie-section ${type}`}>
      <div className="container">
        <h2 className="section-title">{title}</h2>

        <div className="movie-grid">
          {movies.map((movie) => (
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
          ))}
        </div>
      </div>
    </section>
  );
}

export default MovieSection;
