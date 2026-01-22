import "./MovieCard.css";

function MovieCard({ title, age = "P", onBuy }) {
  return (
    <div className="movie-card">
      <div className="poster">
        <span className={`age age-${age.toLowerCase()}`}>
          {age}
        </span>
      </div>

      <h3 className="title">{title}</h3>

      <button className="buy-btn-bottom" onClick={onBuy}>
        Mua vé
      </button>
    </div>
  );
}

export default MovieCard;
