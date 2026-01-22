import { useState } from "react";
import "./Home.css";
import Banner from "./components/Banner/Banner";
import MovieTabs from "./components/MovieTabs/MovieTabs";
import MovieSection from "./components/MovieSection/MovieSection";

function Home() {
  const [activeTab, setActiveTab] = useState("NOW_SHOWING");

  return (
    <div className="home">
      <Banner />

      <MovieTabs
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "NOW_SHOWING" && (
        <MovieSection title="PHIM ĐANG CHIẾU"
        type = "now-showing"
         />
      )}

      {activeTab === "COMING_SOON" && (
        <MovieSection title="PHIM SẮP CHIẾU"
        type = "coming-soon"
         />
      )}
    </div>
  );
}

export default Home;
