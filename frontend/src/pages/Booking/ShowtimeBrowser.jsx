import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { showtimeApi } from "../../api/showtimeApi.js";
import { timeSlotApi } from "../../api/timeSlotApi.js";
import movieApi from "../../api/movieApi.js";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "./ShowtimeBrowser.css";

function formatDateTime(iso) {
    if (!iso) return "";
    const s = String(iso).replace("T", " ");
    return s.slice(0, 16);
}

function getDatePart(iso) {
    if (!iso) return "";
    return String(iso).slice(0, 10); // YYYY-MM-DD
}

function getTimePart(iso) {
    if (!iso) return "";
    const s = String(iso);
    const tIndex = s.indexOf("T");
    if (tIndex === -1) return "";
    return s.slice(tIndex + 1, tIndex + 6); // HH:mm
}

// Parse date safely
function parseDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d;
}

function normalizeDateString(value) {
    if (!value) return "";
    return String(value).slice(0, 10);
}

function isMovieAvailableOnDate(movie, selectedDate) {
    if (!movie || movie.status === "STOPPED" || !selectedDate) return false;

    const releaseDate = normalizeDateString(movie.releaseDate);
    const endDate = normalizeDateString(movie.endDate);

    if (releaseDate && selectedDate < releaseDate) return false;
    if (endDate && selectedDate > endDate) return false;

    return true;
}

export default function ShowtimeBrowser() {
    const nav = useNavigate();
    const location = useLocation();
    const { movieId } = useParams(); // for /booking/movies/:movieId
    const isStaffMode = location.pathname.startsWith("/staff");

    const [items, setItems] = useState([]);           // all showtimes
    const [nowShowingMovies, setNowShowingMovies] = useState([]); // all NOW_SHOWING films
    const [slots, setSlots] = useState([]);           // TimeSlotDTO[]
    const [q, setQ] = useState("");
    const [error, setError] = useState(null);

    // filter state — default to today
    const todayStr = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD in local time
    const [date, setDate] = useState(todayStr);
    const [activeSlotId, _setActiveSlotId] = useState("ALL");
    const [pageOffset, setPageOffset] = useState(0); // 0 = first page (today + 6 days)

    // Build 7-day array based on pageOffset
    const visibleDays = useMemo(() => {
        const days = [];
        const DAY_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
        const startIndex = pageOffset * 7;
        for (let i = startIndex; i < startIndex + 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            days.push({
                value: `${yyyy}-${mm}-${dd}`,
                label: i === 0 ? "Hôm nay" : DAY_VI[d.getDay()],
                dayMonth: `${dd}/${mm}`,
            });
        }
        return days;
    }, [pageOffset]);

    useEffect(() => {
        // Load all showtimes (sử dụng public endpoint)
        showtimeApi
            .listShowtimes()
            .then(setItems)
            .catch((e) => {
                console.error("load showtimes failed", e);
                setError(e);
            });

        // Load all NOW_SHOWING movies so we can display them even if they have no showtimes
        movieApi
            .getNowShowing()
            .then(setNowShowingMovies)
            .catch((e) => {
                console.warn("load now-showing movies failed", e);
                setNowShowingMovies([]);
            });

        // Load time slot tabs (optional - chỉ dành cho admin)
        timeSlotApi
            .list()
            .then(setSlots)
            .catch((e) => {
                console.warn("load time slots failed (expected for public users)", e);
                // Không set error để trang vẫn hoạt động bình thường
                setSlots([]);
            });
    }, []);

    // Filtered showtimes (apply date / slot / time range / search / movieId route param)
    const filtered = useMemo(() => {
        const query = q.trim().toLowerCase();

        // active slot object
        const activeSlot =
            activeSlotId === "ALL"
                ? null
                : slots.find((s) => String(s.id) === String(activeSlotId));

        return (items || []).filter((s) => {
            // filter by movieId if present in route
            if (movieId) {
                const candidates = [
                    s?.movieId,
                    s?.movieID,
                    s?.movie_id,
                    s?.movie?.id,
                ]
                    .filter(Boolean)
                    .map(String);
                if (!candidates.includes(String(movieId))) return false;
            }

            // search by movie title only (no room)
            if (query) {
                const movie = (s.movieTitle || "").toLowerCase();
                if (!movie.includes(query)) return false;
            }

            // date filter
            if (date) {
                const d = getDatePart(s.startTime);
                if (d !== date) return false;
            }

            const hhmm = getTimePart(s.startTime);

            // tab slot range
            if (activeSlot && hhmm) {
                const from = activeSlot.startTime || activeSlot.from || activeSlot.start || "";
                const to = activeSlot.endTime || activeSlot.to || activeSlot.end || "";
                if (from && hhmm < String(from).slice(0, 5)) return false;
                if (to && hhmm > String(to).slice(0, 5)) return false;
            }

            return true;
        });
    }, [items, slots, q, date, activeSlotId, movieId]);

    /**
     * Group by MOVIE (not by room).
     * Always include every NOW_SHOWING movie, even those with no showtimes.
     * If a movieId route param is present, only show that movie.
     */
    const groupedByMovie = useMemo(() => {
        // Build a map with stable keys to avoid overriding movies with same title.
        const map = new Map(); // key: movie:<id> | title:<name>
        const moviesById = new Map();
        const moviesByTitle = new Map();

        for (const movie of nowShowingMovies) {
            moviesById.set(String(movie.id), movie);
            moviesByTitle.set(movie.title, movie);
        }

        // Seed map with all NOW_SHOWING movies (ensures empty-showtime films appear)
        for (const m of nowShowingMovies) {
            if (movieId && String(m.id) !== String(movieId)) continue;
            if (!isMovieAvailableOnDate(m, date)) continue;
            const key = `movie:${m.id}`;
            if (!map.has(key)) {
                map.set(key, {
                    movieKey: key,
                    movieTitle: m.title,
                    posterUrl: m.posterUrl,
                    showtimes: [],
                });
            }
        }

        // Attach filtered showtimes to matching movies
        for (const s of filtered) {
            const title = s.movieTitle || `Phim #${s.movieId}`;
            const sourceMovieId = s?.movieId ?? s?.movieID ?? s?.movie_id ?? s?.movie?.id ?? null;
            const matchedMovie =
                (sourceMovieId !== null ? moviesById.get(String(sourceMovieId)) : null)
                || moviesByTitle.get(title);

            if (matchedMovie && !isMovieAvailableOnDate(matchedMovie, date)) {
                continue;
            }

            const key = matchedMovie
                ? `movie:${matchedMovie.id}`
                : (sourceMovieId !== null ? `movie:${sourceMovieId}` : `title:${title}`);

            if (!map.has(key)) {
                // showtime belongs to a movie not in NOW_SHOWING list � still show it
                map.set(key, {
                    movieKey: key,
                    movieTitle: matchedMovie?.title || title,
                    posterUrl: matchedMovie?.posterUrl || null,
                    showtimes: [],
                });
            }
            map.get(key).showtimes.push(s);
        }

        // Sort showtimes within each movie by startTime
        for (const entry of map.values()) {
            entry.showtimes.sort((a, b) =>
                String(a.startTime).localeCompare(String(b.startTime))
            );
        }

        return Array.from(map.values());
    }, [filtered, nowShowingMovies, movieId, date]);

    const handlePickShowtime = (s, movieTitle) => {
        // 1. Validate suất chiếu chưa qua
        const start = parseDate(s.startTime);
        if (!start || start <= new Date()) {
            alert("Suất chiếu đã qua hoặc không hợp lệ. Vui lòng chọn suất khác.");
            return;
        }

        // 2. Navigate với thông tin phim + giờ chiếu (không cần đăng nhập ở đây)
        nav(isStaffMode ? `/staff/showtimes/${s.id}` : `/booking/showtimes/${s.id}`, {
            state: {
                movieTitle: movieTitle || s.movieTitle || "",
                startTime: s.startTime,
                endTime: s.endTime,
                roomName: s.roomName || "",
            },
        });
    };

    return (
        <div className="showtime-browser">
            <h2>{isStaffMode ? "🎟️ Chọn lịch chiếu để bán vé tại quầy" : "🎬 Lịch chiếu phim"}</h2>
            {isStaffMode && (
                <p className="staff-booking-note">Nhân viên đang thao tác trên luồng bán vé tại quầy. Sau khi chọn suất chiếu, hệ thống sẽ chuyển sang giữ ghế và chốt đơn nội bộ.</p>
            )}

            {/* Search */}
            <div className="search-row">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Tìm theo tên phim..."
                />
            </div>

            {/* Time Slot Tabs - chỉ hiển thị nếu có slots */}
            {/* {slots.length > 0 && (
                <div className="slot-tabs">
                    <button
                        className={`tab ${activeSlotId === "ALL" ? "active" : ""}`}
                        onClick={() => setActiveSlotId("ALL")}
                    >
                        Tất cả
                    </button>
                    {slots.map((sl) => (
                        <button
                            key={sl.id}
                            className={`tab ${String(activeSlotId) === String(sl.id) ? "active" : ""}`}
                            onClick={() => setActiveSlotId(sl.id)}
                            title={`Khung giờ: ${(sl.startTime || sl.from || "").slice(0, 5)} - ${(sl.endTime || sl.to || "").slice(0, 5)}`}
                        >
                            {sl.name || sl.label || `Slot ${sl.id}`}
                        </button>
                    ))}
                </div>
            )} */}

            {/* 7-day picker with navigation arrows */}
            <div className="day-picker-wrapper">
                <button
                    className="day-nav-btn"
                    onClick={() => setPageOffset((p) => Math.max(0, p - 1))}
                    disabled={pageOffset === 0}
                    title="Tuần trước"
                >
                    <FaChevronLeft />
                </button>

                <div className="day-picker">
                    {visibleDays.map((d) => (
                        <button
                            key={d.value}
                            className={`day-btn${date === d.value ? " active" : ""}`}
                            onClick={() => setDate(d.value)}
                        >
                            <span className="day-label">{d.label}</span>
                            <span className="day-date">{d.dayMonth}</span>
                        </button>
                    ))}
                </div>

                <button
                    className="day-nav-btn"
                    onClick={() => setPageOffset((p) => Math.min(1, p + 1))}
                    disabled={pageOffset >= 1}
                    title="Tuần sau"
                >
                    <FaChevronRight />
                </button>
            </div>

            {error ? <pre className="error">{JSON.stringify(error, null, 2)}</pre> : null}

            {/* Movie schedule table */}
            {groupedByMovie.length === 0 ? (
                <div className="schedule-empty">Không có phim đang chiếu.</div>
            ) : (
                <div className="schedule-table-wrapper">
                    <table className="schedule-table">
                        <thead>
                            <tr>
                                <th className="col-movie">Tên phim</th>
                                <th className="col-times">Suất chiếu</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedByMovie.map(({ movieKey, movieTitle, posterUrl, showtimes }) => (
                                <tr key={movieKey} className="schedule-row">
                                    <td className="col-movie">
                                        <div className="movie-name-cell">
                                            {posterUrl && (
                                                <img
                                                    className="mini-poster"
                                                    src={posterUrl}
                                                    alt={movieTitle}
                                                />
                                            )}
                                            <span className="movie-name-text">{movieTitle}</span>
                                        </div>
                                    </td>
                                    <td className="col-times">
                                        {showtimes.length > 0 ? (
                                            <div className="time-badges">
                                                {showtimes.map((s) => {
                                                    const start = parseDate(s.startTime);
                                                    const isPast = start && start <= new Date();
                                                    return (
                                                        <button
                                                            key={s.id}
                                                            className={`time-badge status-${s.status?.toLowerCase()}${isPast ? " past" : ""}`}
                                                            onClick={() => handlePickShowtime(s, movieTitle)}
                                                            title={`${formatDateTime(s.startTime)} → ${formatDateTime(s.endTime)}`}
                                                            disabled={isPast}
                                                        >
                                                            {getTimePart(s.startTime)}
                                                            {s.status === "FULL" && (
                                                                <span className="badge-tag">Hết ghế</span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <span className="no-showtime">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
