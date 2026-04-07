import { useState, useEffect, useCallback } from "react";
import { getAllPromotions } from "../../api/promotionApi";
import {
  FaTicketAlt,
  FaPercent,
  FaCopy,
  FaCheck,
  FaClock,
  FaCalendarAlt,
  FaShoppingCart,
  FaGift,
  FaMoneyBillWave,
  FaBullhorn,
} from "react-icons/fa";
import "./NewsPromotions.css";

function NewsPromotions() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        setLoading(true);
        const data = await getAllPromotions();
        // Only show ACTIVE promotions that haven't expired
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const activePromotions = (data || []).filter((p) => {
          if (p.status !== "ACTIVE") return false;
          const endDate = new Date(p.endDate);
          endDate.setHours(23, 59, 59, 999);
          return endDate >= now;
        });
        setPromotions(activePromotions);
      } catch (error) {
        console.error("Failed to fetch promotions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  const handleCopy = useCallback(async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  }, []);

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return num.toLocaleString("vi-VN") + "đ";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getDiscountDisplay = (promo) => {
    if (promo.discountType === "PERCENTAGE") {
      return `-${promo.discountValue}%`;
    }
    return `-${formatCurrency(promo.discountValue)}`;
  };

  const getDiscountLabel = (promo) => {
    if (promo.discountType === "PERCENTAGE") {
      return "Giảm phần trăm trên tổng đơn";
    }
    return "Giảm trực tiếp trên tổng đơn";
  };

  const renderCountdown = (promo) => {
    const days = getDaysRemaining(promo.endDate);
    if (days === null) return null;

    if (days <= 3) {
      return (
        <div className="promo-countdown expiring-soon">
          <FaClock />
          {days <= 0 ? "Hết hạn hôm nay" : `Còn ${days} ngày`}
        </div>
      );
    }

    return (
      <div className="promo-countdown active">
        <FaClock />
        Còn {days} ngày
      </div>
    );
  };

  const renderSkeletons = () => (
    <div className="promo-skeleton-grid">
      {[1, 2, 3].map((i) => (
        <div key={i} className="promo-skeleton-card" />
      ))}
    </div>
  );

  const renderEmpty = () => (
    <div className="promo-empty">
      <div className="promo-empty-icon"><FaTicketAlt /></div>
      <h3>Chưa có khuyến mãi nào</h3>
      <p>Hãy quay lại sau để không bỏ lỡ những ưu đãi hấp dẫn!</p>
    </div>
  );

  const renderPromoCard = (promo) => {
    const isPercentage = promo.discountType === "PERCENTAGE";
    const typeClass = isPercentage ? "percentage" : "fixed";
    const isCopied = copiedCode === promo.code;

    return (
      <div className="promo-card" key={promo.id}>
        <div className="promo-card-glow" />

        {/* Top Half */}
        <div className="promo-card-top">
          <div className={`promo-card-badge ${typeClass}`}>
            {isPercentage ? <FaPercent /> : <FaMoneyBillWave />}
            {isPercentage ? "Giảm %" : "Giảm tiền"}
          </div>

          <div className={`promo-discount-value ${typeClass}`}>
            {getDiscountDisplay(promo)}
          </div>

          <div className="promo-discount-label">{getDiscountLabel(promo)}</div>

          {promo.minOrderAmount > 0 && (
            <div className="promo-min-order">
              Đơn tối thiểu {formatCurrency(promo.minOrderAmount)}
            </div>
          )}
        </div>

        {/* Dashed separator */}
        <hr className="promo-card-dashed" />

        {/* Bottom Half */}
        <div className="promo-card-bottom">
          <div className="promo-description">
            {promo.description || "\u00A0"}
          </div>

          {/* Code box */}
          <div className="promo-code-box">
            <div className="promo-code-display">{promo.code}</div>
            <button
              className={`promo-code-copy ${isCopied ? "copied" : ""}`}
              onClick={() => handleCopy(promo.code)}
              title="Sao chép mã"
            >
              {isCopied ? (
                <>
                  <FaCheck /> Đã sao chép
                </>
              ) : (
                <>
                  <FaCopy /> Sao chép
                </>
              )}
            </button>
          </div>

          {/* Meta info */}
          <div className="promo-meta">
            <div className="promo-meta-item">
              <FaCalendarAlt />
              {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
            </div>

            {promo.maxUsage && (
              <div className="promo-meta-item">
                <FaShoppingCart />
                Còn {Math.max(0, promo.maxUsage - (promo.currentUsage || 0))}{" "}
                lượt
              </div>
            )}

            {renderCountdown(promo)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="news-promotions-page">
      {/* Hero */}
      <div className="promo-hero">
        <div className="promo-hero-content">
          <div className="promo-hero-icon"><FaBullhorn /></div>
          <h1>Tin Mới & Ưu Đãi</h1>
          <p>
            Khám phá các mã khuyến mãi độc quyền từ AstraCine. Sao chép mã và
            áp dụng khi thanh toán để nhận ưu đãi ngay!
          </p>
        </div>
      </div>

      {/* Promotions Section */}
      <div className="promo-section">
        <div className="promo-section-title">
          <div className="section-icon">
            <FaGift />
          </div>
          <h2>Mã Khuyến Mãi</h2>
          {!loading && promotions.length > 0 && (
            <span className="badge-count">
              {promotions.length} mã đang hoạt động
            </span>
          )}
        </div>

        {loading
          ? renderSkeletons()
          : promotions.length === 0
            ? renderEmpty()
            : (
              <div className="promo-grid">
                {promotions.map((promo) => renderPromoCard(promo))}
              </div>
            )}
      </div>
    </div>
  );
}

export default NewsPromotions;
