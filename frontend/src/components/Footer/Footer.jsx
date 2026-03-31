import "./Footer.css";

const footerLinks = {
  about: [
    { label: "Về AstraCine", href: "#" },
    { label: "Về chúng tôi", href: "#" },
    { label: "Tuyển dụng", href: "#" },
    { label: "Liên hệ", href: "#" },
  ],
  policy: [
    { label: "Quy định thành viên", href: "#" },
    { label: "Điều khoản sử dụng", href: "#" },
    { label: "Hướng dẫn đặt vé trực tuyến", href: "https://www.youtube.com/watch?v=10YzP-pnBIo&list=RD10YzP-pnBIo&start_radio=1" },
    { label: "Quy định và chính sách chung", href: "#" },
    { label: "Chính sách bảo vệ thông tin cá nhân", href: "#" },
  ],
};

const socialLinks = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/hg.my257",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/watch?v=lgT1AidzRWM",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
        <polygon fill="#0b0f1a" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
      </svg>
    ),
  },
];

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__video-bg">
        {/* Video Goku SSJ4 lấy trực tiếp từ nguồn online, không cần tải */}
        <video autoPlay loop muted playsInline poster="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExenQzMXp1eXRqMzJ3YjlqOWk0MWNmeTRwYTI4b3V6Z240OHhucGNkdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9EvnXdZaUZbCqScn67/giphy.gif">
          <source src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExenQzMXp1eXRqMzJ3YjlqOWk0MWNmeTRwYTI4b3V6Z240OHhucGNkdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/9EvnXdZaUZbCqScn67/giphy.mp4" type="video/mp4" />
        </video>
        <div className="footer__overlay"></div>
      </div>

      <div className="footer__inner">
        {/* Main grid */}
        <div className="footer__grid">

          {/* Brand column */}
          <div className="footer__col footer__col--brand">
            <div className="footer__logo">
              <span className="footer__logo-icon">✦</span>
              <span className="footer__logo-text">AstraCine</span>
            </div>
            <p className="footer__tagline">
              Trải nghiệm điện ảnh vượt không gian — mỗi suất chiếu là một hành trình.
            </p>
            <div className="footer__socials">
              {socialLinks.map((s) => (
                <a key={s.name} href={s.href} className="footer__social-btn" aria-label={s.name} title={s.name}>
                  {s.icon}
                </a>
              ))}
            </div>

          </div>

          {/* About column */}
          <div className="footer__col">
            <h4 className="footer__heading">
              <span className="footer__heading-bar" />
              Về AstraCine
            </h4>
            <ul className="footer__links">
              {footerLinks.about.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="footer__link">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Policy column */}
          <div className="footer__col">
            <h4 className="footer__heading">
              <span className="footer__heading-bar" />
              Quy Định & Điều Khoản
            </h4>
            <ul className="footer__links">
              {footerLinks.policy.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="footer__link">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact column */}
          <div className="footer__col">
            <h4 className="footer__heading">
              <span className="footer__heading-bar" />
              Chăm Sóc Khách Hàng
            </h4>
            <div className="footer__contact-list">
              <div className="footer__contact-item">
                <span className="footer__contact-icon">📞</span>
                <div>
                  <div className="footer__contact-label">Hotline</div>
                  <a href="tel:19002099" className="footer__contact-value">0348728832</a>
                </div>
              </div>
              <div className="footer__contact-item">
                <span className="footer__contact-icon">🕐</span>
                <div>
                  <div className="footer__contact-label">Giờ làm việc</div>
                  <div className="footer__contact-value">9:00 – 22:00 (Tất cả các ngày)</div>
                </div>
              </div>
              <div className="footer__contact-item">
                <span className="footer__contact-icon">✉️</span>
                <div>
                  <div className="footer__contact-label">Email hỗ trợ</div>
                  <a href="mailto:cskh@astracine.vn" className="footer__contact-value">cskh@astracine.vn</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="footer__divider" />

        {/* Bottom bar */}
        <div className="footer__bottom">
          <div className="footer__company">
            <span className="footer__company-name">Công ty TNHH AstraCine Việt Nam</span>
            <span className="footer__company-sep">·</span>
            <span>Tầng 29, Tòa nhà Big Cine, 898 Nguyễn Văn Linh, Đà Nẵng</span>
          </div>
          <div className="footer__copy">
            © 2026 AstraCine. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;