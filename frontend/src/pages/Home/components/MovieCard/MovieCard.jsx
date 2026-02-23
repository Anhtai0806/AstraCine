import "./MovieCard.css";

function MovieCard({ title, age = "P", posterUrl, onBuy, onClick, status }) {
  // Determine button state based on status
  const isComingSoon = status === 'COMING_SOON';
  const isEnded = status === 'ENDED' || status === 'STOPPED';

  const getButtonLabel = () => {
    if (isComingSoon) return 'Coming Soon';
    if (isEnded) return 'Ngưng Chiếu';
    return 'Mua vé';
  };

  const getButtonClass = () => {
    if (isComingSoon) return 'buy-btn-bottom coming-soon';
    if (isEnded) return 'buy-btn-bottom ended';
    return 'buy-btn-bottom';
  };

  return (
    <div
      className="movie-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="poster">
        <img src={posterUrl} alt={title} />
        <span className={`age age-${age ? age.toLowerCase() : 'p'}`}>
          {age || 'P'}
        </span>
      </div>

      <h3 className="title">{title}</h3>

      <button
        className={getButtonClass()}
        onClick={(e) => {
          e.stopPropagation();
          if (!isComingSoon && !isEnded) {
            onBuy();
          }
        }}
        disabled={isComingSoon || isEnded}
      >
        {getButtonLabel()}
      </button>
    </div>
  );
}

export default MovieCard;
