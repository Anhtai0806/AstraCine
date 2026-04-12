import { useEffect, useState } from "react";
import "./Banner.css";

// Fallback: ảnh local dùng khi API chưa có data
import banner1 from "../../../../assets/banner1.jpg";
import banner2 from "../../../../assets/banner2.jpg";
import banner3 from "../../../../assets/banner3.jpg";

const FALLBACK_BANNERS = [
  { id: "f1", imageUrl: banner1, title: "" },
  { id: "f2", imageUrl: banner2, title: "" },
  { id: "f3", imageUrl: banner3, title: "" },
];

function Banner() {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch từ API khi mount
  useEffect(() => {
    fetch("http://localhost:8080/api/banners")
      .then((res) => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBanners(data);
        } else {
          setBanners(FALLBACK_BANNERS);
        }
      })
      .catch(() => {
        // API lỗi hoặc backend chưa chạy → dùng ảnh local
        setBanners(FALLBACK_BANNERS);
      });
  }, []);

  // Auto slide
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [banners]);

  const handlePrev = () => {
    setCurrentIndex(
      currentIndex === 0 ? banners.length - 1 : currentIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((currentIndex + 1) % banners.length);
  };

  if (banners.length === 0) return null;

  return (
    <div className="banner-wrapper">
      <section className="banner">
        {banners.map((item, index) => (
          <div
            key={item.id}
            className={`banner-slide ${index === currentIndex ? "active" : ""}`}
            style={{
              backgroundImage: `url(${item.imageUrl})`,
              cursor: item.linkUrl ? "pointer" : "default",
            }}
            onClick={() => {
              if (item.linkUrl) {
                window.open(item.linkUrl, "_blank", "noopener,noreferrer");
              }
            }}
          />
        ))}

        {/* Arrows */}
        {banners.length > 1 && (
          <>
            <button className="banner-arrow left" onClick={handlePrev}>‹</button>
            <button className="banner-arrow right" onClick={handleNext}>›</button>
          </>
        )}

        {/* Dots */}
        {banners.length > 1 && (
          <div className="banner-dots">
            {banners.map((_, index) => (
              <span
                key={index}
                className={`dot ${index === currentIndex ? "active" : ""}`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Banner;
