import "./MovieCard.css";

function MovieCard({ title, age = "P", posterUrl, onBuy }) {
  return (
    <div className="movie-card">
      <div className="poster">
        <img src={posterUrl} alt={title} />
        <span className={`age age-${age ? age.toLowerCase() : 'p'}`}>
          {age || 'P'}
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
