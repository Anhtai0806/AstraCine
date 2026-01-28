import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { showtimeApi } from "../../api/showtimeApi.js";
import { timeSlotApi } from "../../api/timeSlotApi.js";
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

export default function ShowtimeBrowser() {
    const nav = useNavigate();
    const [items, setItems] = useState([]);
    const [slots, setSlots] = useState([]); // TimeSlotDTO[]
    const [q, setQ] = useState("");
    const [error, setError] = useState(null);

    // filter state
    const [date, setDate] = useState(""); // optional
    const [activeSlotId, setActiveSlotId] = useState("ALL");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");

    useEffect(() => {
        showtimeApi
            .listShowtimes()
            .then(setItems)
            .catch((e) => {
                console.error("load showtimes failed", e);
                setError(e);
            });

        timeSlotApi
            .list()
            .then(setSlots)
            .catch((e) => {
                console.warn("load time slots failed", e);
                setSlots([]);
            });
    }, []);

    const filtered = useMemo(() => {
        const query = q.trim().toLowerCase();

        // active slot object
        const activeSlot =
            activeSlotId === "ALL" ? null : slots.find((s) => String(s.id) === String(activeSlotId));

        return (items || []).filter((s) => {
            // search
            if (query) {
                const movie = (s.movieTitle || "").toLowerCase();
                const room = (s.roomName || "").toLowerCase();
                if (!(movie.includes(query) || room.includes(query))) return false;
            }

            // date
            if (date) {
                const d = getDatePart(s.startTime);
                if (d !== date) return false;
            }

            const hhmm = getTimePart(s.startTime);

            // tab slot range (admin tạo)
            if (activeSlot && hhmm) {
                // TimeSlotDTO thường có startTime/endTime hoặc from/to → bạn chỉnh đúng field
                const from = activeSlot.startTime || activeSlot.from || activeSlot.start || "";
                const to = activeSlot.endTime || activeSlot.to || activeSlot.end || "";

                if (from && hhmm < String(from).slice(0, 5)) return false;
                if (to && hhmm > String(to).slice(0, 5)) return false;
            }

            // custom range inside tab
            if (customFrom && hhmm && hhmm < customFrom) return false;
            if (customTo && hhmm && hhmm > customTo) return false;

            return true;
        });
    }, [items, slots, q, date, activeSlotId, customFrom, customTo]);

    const grouped = useMemo(() => {
        const map = new Map();
        for (const s of filtered || []) {
            const key = s.roomName || `Room ${s.roomId}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(s);
        }
        for (const [, arr] of map) {
            arr.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
        }
        return Array.from(map.entries());
    }, [filtered]);

    return (
        <div className="showtime-browser">
            <h2>Lịch chiếu</h2>

            <div className="search-row">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Tìm theo tên phim hoặc phòng chiếu..."
                />
            </div>

            {/* ✅ Tabs khung giờ (admin tạo) */}
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

            {/* ✅ Trong tab: chọn giờ tuỳ thích */}
            <div className="slot-custom">
                <div className="filter-item">
                    <label>Ngày</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>

                <div className="filter-item">
                    <label>Từ giờ</label>
                    <input type="time" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                </div>

                <div className="filter-item">
                    <label>Đến giờ</label>
                    <input type="time" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </div>

                <button
                    className="btn-clear"
                    onClick={() => {
                        setDate("");
                        setCustomFrom("");
                        setCustomTo("");
                        setActiveSlotId("ALL");
                    }}
                    title="Xóa tất cả bộ lọc"
                >
                    Xóa lọc
                </button>
            </div>

            {error ? <pre className="error">{JSON.stringify(error, null, 2)}</pre> : null}

            {grouped.map(([roomName, list]) => (
                <div key={roomName} className="room-block">
                    <h3>{roomName}</h3>
                    <div className="showtime-list">
                        {list.map((s) => (
                            <button
                                key={s.id}
                                className="showtime-item"
                                onClick={() => nav(`/booking/showtimes/${s.id}`)}
                                title="Chọn suất chiếu để đặt ghế"
                            >
                                <div className="movie">{s.movieTitle}</div>
                                <div className="time">
                                    {formatDateTime(s.startTime)} → {formatDateTime(s.endTime)}
                                </div>
                                <div className="meta">Trạng thái: {s.status}</div>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
