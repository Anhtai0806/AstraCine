import "./MovieSection.css";
import MovieCard from "../MovieCard/MovieCard";

function MovieSection({ title, type, movies = [] }) {
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
              onBuy={() => {
                console.log("Mua vé:", movie.title);
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default MovieSection;
