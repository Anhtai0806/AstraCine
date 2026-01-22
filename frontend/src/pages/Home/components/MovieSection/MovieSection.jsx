import "./MovieSection.css";
import MovieCard from "../MovieCard/MovieCard";

function MovieSection({ title, type }) {
  const mockMovies = [
    { id: 1, title: "Movie 1", age: "P" },
    { id: 2, title: "Movie 2", age: "C13" },
    { id: 3, title: "Movie 3", age: "C16" },
    { id: 4, title: "Movie 4", age: "P" },
  ];

  return (
    <section className={`movie-section ${type}`}>
      <div className="container">
        <h2 className="section-title">{title}</h2>

        <div className="movie-grid">
          {mockMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              title={movie.title}
              age={movie.age}
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
