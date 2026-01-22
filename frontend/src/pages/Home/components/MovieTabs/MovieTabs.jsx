import "./MovieTabs.css";

function MovieTabs({ activeTab, onChange }) {
  return (
    <div className="movie-tabs-wrapper container">
    <div className="movie-tabs">
      <button
        className={`tab ${activeTab === "NOW_SHOWING" ? "active" : ""}`}
        onClick={() => onChange("NOW_SHOWING")}
      >
        Đang chiếu
      </button>

      <button
        className={`tab ${activeTab === "COMING_SOON" ? "active" : ""}`}
        onClick={() => onChange("COMING_SOON")}
      >
        Sắp chiếu
      </button>
    </div>
    </div>
  );
}

export default MovieTabs;
