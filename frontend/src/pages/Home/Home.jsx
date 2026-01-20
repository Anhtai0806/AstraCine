import "./Home.css";

function Home() {
  return (
    <div className="home">
      {/* BANNER */}
      <section className="banner">
        <h1>Welcome to AstraCine</h1>
        <p>Enjoy the best movie experience</p>
      </section>

      {/* MOVIE SECTION */}
      <section className="movie-section">
  <div className="container-fluid">
    <div className="container">
      <h2>Now Showing</h2>

      <div className="row mt-4">
        <div className="col-lg-3 col-md-4 col-sm-6 mb-4">
          <div className="movie-card">Movie 1</div>
        </div>
        <div className="col-lg-3 col-md-4 col-sm-6 mb-4">
          <div className="movie-card">Movie 2</div>
        </div>
        <div className="col-lg-3 col-md-4 col-sm-6 mb-4">
          <div className="movie-card">Movie 3</div>
        </div>
        <div className="col-lg-3 col-md-4 col-sm-6 mb-4">
          <div className="movie-card">Movie 4</div>
        </div>
      </div>
    </div>
  </div>
</section>

    </div>
  );
}

export default Home;
