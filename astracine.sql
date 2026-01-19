-- Reset clean (no "already exists" warnings)
SET FOREIGN_KEY_CHECKS = 0;
DROP DATABASE IF EXISTS astracine;
CREATE DATABASE astracine CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 1;

USE astracine;

-- ======================
-- 1. ROLES
-- ======================
CREATE TABLE roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE -- ADMIN / STAFF
);

-- ======================
-- 2. USERS
-- ======================
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ======================
-- 3. USER_ROLES
-- ======================
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- ======================
-- 4. GENRES
-- ======================
CREATE TABLE genres (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- ======================
-- 5. MOVIES
-- ======================
CREATE TABLE movies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL,
    release_date DATE,
    end_date DATE,
    age_rating VARCHAR(10),
    status VARCHAR(20) DEFAULT 'SHOWING',
    poster_url TEXT,
    trailer_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- 6. ROOMS
-- ======================
CREATE TABLE rooms (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    total_rows INT NOT NULL,
    total_columns INT NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);

-- ======================
-- 7. MEMBERSHIPS
-- ======================
CREATE TABLE memberships (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20), -- NORMAL / SILVER / GOLD
    discount_percent INT,
    min_total_spent DECIMAL(14,2)
);

-- ======================
-- 8. COMBOS
-- ======================
CREATE TABLE combos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);

-- ======================
-- 9. PROMOTIONS
-- ======================
CREATE TABLE promotions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    discount_type VARCHAR(20), -- PERCENT / FIXED
    discount_value DECIMAL(12,2),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20)
);

-- ======================
-- 10. CUSTOMERS
-- ======================
CREATE TABLE customers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    membership_id BIGINT,
    total_spent DECIMAL(14,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (membership_id) REFERENCES memberships(id)
);

-- ======================
-- 11. SEATS
-- ======================
CREATE TABLE seats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    room_id BIGINT NOT NULL,
    row_label VARCHAR(5) NOT NULL,
    column_number INT NOT NULL,
    seat_type VARCHAR(20) DEFAULT 'NORMAL',
    UNIQUE (room_id, row_label, column_number),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- ======================
-- 12. SHOWTIMES
-- ======================
CREATE TABLE showtimes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    movie_id BIGINT NOT NULL,
    room_id BIGINT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status VARCHAR(20) DEFAULT 'OPEN',
    FOREIGN KEY (movie_id) REFERENCES movies(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- ======================
-- 13. MOVIE_GENRES
-- ======================
CREATE TABLE movie_genres (
    movie_id BIGINT NOT NULL,
    genre_id BIGINT NOT NULL,
    PRIMARY KEY (movie_id, genre_id),
    FOREIGN KEY (movie_id) REFERENCES movies(id),
    FOREIGN KEY (genre_id) REFERENCES genres(id)
);

-- ======================
-- 14. BOOKINGS
-- ======================
CREATE TABLE bookings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT,
    showtime_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL, -- HOLD / CONFIRMED / CANCELLED
    expired_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (showtime_id) REFERENCES showtimes(id)
);

-- ======================
-- 15. SHOWTIME_SEATS
-- ======================
CREATE TABLE showtime_seats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    showtime_id BIGINT NOT NULL,
    seat_id BIGINT NOT NULL,
    booking_id BIGINT,
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    hold_expired_at DATETIME,
    UNIQUE (showtime_id, seat_id),
    FOREIGN KEY (showtime_id) REFERENCES showtimes(id),
    FOREIGN KEY (seat_id) REFERENCES seats(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- ======================
-- 16. INVOICES
-- ======================
CREATE TABLE invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT,
    staff_id BIGINT NOT NULL,
    showtime_id BIGINT NOT NULL,
    total_amount DECIMAL(14,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (staff_id) REFERENCES users(id),
    FOREIGN KEY (showtime_id) REFERENCES showtimes(id)
);

-- ======================
-- 17. PAYMENTS
-- ======================
CREATE TABLE payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    payment_method VARCHAR(20),
    transaction_code VARCHAR(100),
    amount DECIMAL(14,2),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- ======================
-- 18. TICKETS
-- ======================
CREATE TABLE tickets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    showtime_seat_id BIGINT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    qr_code TEXT,
    status VARCHAR(20) DEFAULT 'VALID',
    UNIQUE (showtime_seat_id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (showtime_seat_id) REFERENCES showtime_seats(id)
);

-- ======================
-- 19. INVOICE_COMBOS
-- ======================
CREATE TABLE invoice_combos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    combo_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (combo_id) REFERENCES combos(id)
);

-- ======================
-- 20. INVOICE_PROMOTIONS
-- ======================
CREATE TABLE invoice_promotions (
    invoice_id BIGINT NOT NULL,
    promotion_id BIGINT NOT NULL,
    PRIMARY KEY (invoice_id, promotion_id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (promotion_id) REFERENCES promotions(id)
);

