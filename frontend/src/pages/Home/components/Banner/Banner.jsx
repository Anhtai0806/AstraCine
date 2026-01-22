import { useEffect, useState } from "react";
import "./Banner.css";

import banner1 from "../../../../assets/banner1.jpg";
import banner2 from "../../../../assets/banner2.jpg";
import banner3 from "../../../../assets/banner3.jpg";

const banners = [banner1, banner2, banner3];

function Banner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setCurrentIndex(
      currentIndex === 0 ? banners.length - 1 : currentIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((currentIndex + 1) % banners.length);
  };

  return (
    <div className="banner-wrapper">
    <section className="banner">
      {banners.map((image, index) => (
        <div
          key={index}
          className={`banner-slide ${
            index === currentIndex ? "active" : ""
          }`}
          style={{ backgroundImage: `url(${image})` }}
        />
      ))}

      {/* Arrows */}
      <button className="banner-arrow left" onClick={handlePrev}>
        ‹
      </button>
      <button className="banner-arrow right" onClick={handleNext}>
        ›
      </button>

      {/* Dots */}
      <div className="banner-dots">
        {banners.map((_, index) => (
          <span
            key={index}
            className={`dot ${index === currentIndex ? "active" : ""}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </section>
    </div>
  );
}

export default Banner;
