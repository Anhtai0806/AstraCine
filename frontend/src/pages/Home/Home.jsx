import { useState, useEffect } from "react";
import "./Home.css";
import Banner from "./components/Banner/Banner";
import MovieTabs from "./components/MovieTabs/MovieTabs";
import MovieSection from "./components/MovieSection/MovieSection";
import movieApi from "../../api/movieApi";

function Home() {
  const [activeTab, setActiveTab] = useState("NOW_SHOWING");
  const [nowShowingMovies, setNowShowingMovies] = useState([]);
  const [comingSoonMovies, setComingSoonMovies] = useState([]);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const nowShowing = await movieApi.getNowShowing();
        setNowShowingMovies(nowShowing);

        const comingSoon = await movieApi.getComingSoon();
        setComingSoonMovies(comingSoon);
      } catch (error) {
        console.error("Failed to fetch movies:", error);
      }
    };

    fetchMovies();
  }, []);

  return (
    <div className="home">
      <Banner />

      <MovieTabs
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "NOW_SHOWING" && (
        <MovieSection
          title="PHIM ĐANG CHIẾU"
          type="now-showing"
          movies={nowShowingMovies}
        />
      )}

      {activeTab === "COMING_SOON" && (
        <MovieSection
          title="PHIM SẮP CHIẾU"
          type="coming-soon"
          movies={comingSoonMovies}
        />
      )}
    </div>
  );
}
export default Home;
