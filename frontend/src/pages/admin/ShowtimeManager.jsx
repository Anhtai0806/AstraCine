import React, { useEffect, useState } from 'react';
import axiosClient from '../../services/axiosClient';
import SeatGrid from '../../components/admin/SeatGrid';
import './ShowtimeManager.css';

// --- CONFIG ---
const START_HOUR = 7;
const END_HOUR = 31; // 7h sáng hôm sau
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

const ShowtimeManager = () => {
    // --- STATES ---
    const [view, setView] = useState('timeline'); // 'timeline' | 'calendar'
    const [date, setDate] = useState(new Date());

    // Data
    const [movies, setMovies] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [showtimes, setShowtimes] = useState([]);

    // UI & Modals
    const [modal, setModal] = useState(null); // { type: 'create' | 'seat', data: ... }
    const [createForm, setCreateForm] = useState({ movieId: '', roomId: '', startTime: '' });
    const [selectedSeats, setSelectedSeats] = useState(null);
    const [roomCols, setRoomCols] = useState(10);

    // --- INIT ---
    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [m, r, s] = await Promise.all([
                axiosClient.get('/admin/movies'),
                axiosClient.get('/admin/rooms'),
                axiosClient.get('/admin/showtimes')
            ]);
            setMovies(m.data);
            setRooms(r.data);
            setShowtimes(s.data);
        } catch (e) { console.error(e); }
    };

    // --- LOGIC: CALENDAR GENERATION (GLOBAL STANDARD) ---
    // Sinh ra lưới 42 ngày (6 tuần) để lấp đầy lịch mà không bị lỗi thiếu ngày
    const generateCalendarGrid = (currentDate) => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);

        // Tìm ngày bắt đầu của lưới (Chủ nhật tuần chứa ngày mùng 1)
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Lùi về Chủ nhật

        const days = [];
        // Sinh ra 42 ngày (7 ngày x 6 hàng)
        for (let i = 0; i < 42; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            days.push(d);
        }
        return days;
    };

    // --- LOGIC: TIMELINE POSITION ---
    const getTimelineStyle = (startStr, duration) => {
        const d = new Date(startStr);
        let h = d.getHours();
        if (h < START_HOUR) h += 24; // Xử lý qua đêm

        const startMinutes = (h * 60 + d.getMinutes()) - (START_HOUR * 60);
        const left = (startMinutes / TOTAL_MINUTES) * 100;
        const width = ((duration + 15) / TOTAL_MINUTES) * 100; // +15p dọn dẹp

        return { left: `${left}%`, width: `${width}%` };
    };

    // --- ACTIONS ---
    const handleNav = (direction) => {
        const newDate = new Date(date);
        if (view === 'timeline') newDate.setDate(newDate.getDate() + direction);
        else newDate.setMonth(newDate.getMonth() + direction);
        setDate(newDate);
    };

    const handleTrackClick = (e, roomId) => {
        if (e.target.className !== 'tl-track') return;
        const rect = e.target.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const totalMins = percent * TOTAL_MINUTES + (START_HOUR * 60);

        let h = Math.floor(totalMins / 60); if (h >= 24) h -= 24;
        const m = Math.floor(totalMins % 60);

        setCreateForm({
            movieId: '', roomId,
            startTime: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        });
        setModal({ type: 'create' });
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        try {
            const dStr = date.toISOString().split('T')[0]; // Lấy ngày hiện tại đang xem
            await axiosClient.post('/admin/showtimes', {
                ...createForm,
                startTime: `${dStr}T${createForm.startTime}:00`
            });
            alert("✅ Đã tạo lịch chiếu!");
            setModal(null);
            loadData();
        } catch (e) { alert("Lỗi: " + e.response?.data?.message); }
    };

    const openSeatModal = async (showtime) => {
        try {
            const res = await axiosClient.get(`/admin/showtimes/${showtime.id}/seats`);
            const data = res.data;
            // Xử lý dữ liệu ghế (Flatten & Sort)
            let flat = data.seatRows.flatMap(r => r.seats).map(s => ({
                ...s, id: s.showtimeSeatId, seatType: s.type, basePrice: s.finalPrice
            }));
            flat.sort((a, b) => a.rowLabel.localeCompare(b.rowLabel) || a.columnNumber - b.columnNumber);
            const max = Math.max(...flat.map(s => s.columnNumber));

            setRoomCols(max > 0 ? max : 10);
            setSelectedSeats({ ...data, seats: flat });
            setModal({ type: 'seat' });
        } catch (e) { alert("Lỗi tải ghế"); }
    };

    // --- RENDERS ---
    const renderTimeline = () => {
        const dateStr = date.toISOString().split('T')[0];
        const todayShows = showtimes.filter(s => s.startTime.startsWith(dateStr));

        return (
            <div className="timeline-wrapper">
                <div className="timeline-body">
                    {/* Sticky Header */}
                    <div className="tl-header-row">
                        <div className="tl-corner">Phòng / Giờ</div>
                        <div className="tl-hours">
                            {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                                <div key={i} className="tl-hour-cell">
                                    {String((START_HOUR + i) % 24).padStart(2, '0')}:00
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rooms Tracks */}
                    {rooms.map(r => (
                        <div key={r.id} className="tl-room-row">
                            <div className="tl-room-info">
                                <div className="tl-room-name">{r.name}</div>
                                {/* 👇 FIX: Hiển thị chính xác số ghế */}
                                <div className="tl-room-cap">
                                    {r.seatCount || (r.totalRows * r.totalColumns) || 0} ghế
                                </div>
                            </div>
                            <div
                                className="tl-track"
                                onClick={(e) => handleTrackClick(e, r.id)}
                                title="Click để tạo suất chiếu"
                            >
                                {todayShows.filter(s => s.roomId === r.id).map(s => (
                                    <div
                                        key={s.id}
                                        className={`show-card c-${s.movieId % 5}`}
                                        style={getTimelineStyle(s.startTime, s.movieDuration || 120)}
                                        onClick={(e) => { e.stopPropagation(); openSeatModal(s); }}
                                    >
                                        <div style={{ fontWeight: '700' }}>{s.movieTitle}</div>
                                        <div style={{ opacity: 0.9, fontSize: '0.7rem' }}>
                                            {s.startTime.split('T')[1].slice(0, 5)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderCalendar = () => {
        const days = generateCalendarGrid(date);

        return (
            <div className="calendar-wrapper">
                <div className="cal-container">
                    <div className="cal-header">
                        {['CN', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'].map(d => (
                            <div key={d} className="cal-weekday">{d}</div>
                        ))}
                    </div>
                    <div className="cal-grid">
                        {days.map((d, i) => {
                            const dStr = d.toISOString().split('T')[0];
                            const isCurrentMonth = d.getMonth() === date.getMonth();
                            const isToday = new Date().toISOString().startsWith(dStr);
                            const count = showtimes.filter(s => s.startTime.startsWith(dStr)).length;

                            return (
                                <div
                                    key={i}
                                    className={`cal-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                                    onClick={() => { setDate(d); setView('timeline'); }}
                                >
                                    <div className="day-num">{d.getDate()}</div>
                                    {count > 0 && (
                                        <div className="day-dots">
                                            {/* Chỉ hiện tối đa 5 chấm đại diện */}
                                            {Array.from({ length: Math.min(count, 5) }).map((_, idx) => (
                                                <div key={idx} className="dot" />
                                            ))}
                                            {count > 5 && <span className="more-tag">+{count - 5}</span>}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="app-container">
            {/* HEADER */}
            <div className="app-header">
                <div className="header-left">
                    <div className="app-title">Lịch Chiếu Phim</div>
                    <div className="view-toggles">
                        <button className={`toggle-btn ${view === 'timeline' ? 'active' : ''}`} onClick={() => setView('timeline')}>Timeline</button>
                        <button className={`toggle-btn ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}>Lịch Tháng</button>
                    </div>
                </div>

                <div className="date-controls">
                    <button className="nav-btn" onClick={() => handleNav(-1)}>‹</button>
                    <div className="current-date">
                        {view === 'timeline'
                            ? date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
                            : `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`
                        }
                    </div>
                    <button className="nav-btn" onClick={() => handleNav(1)}>›</button>
                </div>

                <button className="btn-create" onClick={() => {
                    setCreateForm({ movieId: '', roomId: rooms[0]?.id || '', startTime: '' });
                    setModal({ type: 'create' });
                }}>+ Tạo Mới</button>
            </div>

            {/* BODY */}
            {view === 'timeline' ? renderTimeline() : renderCalendar()}

            {/* MODAL: CREATE */}
            {modal?.type === 'create' && (
                <div className="showtime-modal-backdrop" onClick={() => setModal(null)}>
                    <div className="modal-panel" onClick={e => e.stopPropagation()}>
                        <div className="modal-head">
                            <h3>Thêm Suất Chiếu Mới</h3>
                            <button className="nav-btn" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <div className="modal-content">
                            <form onSubmit={handleCreateSubmit}>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Phim</label>
                                    <select style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                                        value={createForm.movieId} onChange={e => setCreateForm({ ...createForm, movieId: e.target.value })} required>
                                        <option value="">-- Chọn phim --</option>
                                        {movies.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                                    </select>
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Phòng</label>
                                    <select style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                                        value={createForm.roomId} onChange={e => setCreateForm({ ...createForm, roomId: e.target.value })} required>
                                        {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ marginBottom: 24 }}>
                                    <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Giờ Bắt Đầu</label>
                                    <input type="time" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                                        value={createForm.startTime} onChange={e => setCreateForm({ ...createForm, startTime: e.target.value })} required />
                                </div>
                                <button type="submit" className="btn-create" style={{ width: '100%' }}>Lưu Lịch Chiếu</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: SEAT */}
            {modal?.type === 'seat' && selectedSeats && (
                <div className="showtime-modal-backdrop" onClick={() => setModal(null)}>
                    <div className="modal-panel" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-head">
                            <h3>{selectedSeats.movieTitle}</h3>
                            <button className="nav-btn" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <div className="modal-content" style={{ background: '#f8fafc', display: 'flex', justifyContent: 'center' }}>
                            <SeatGrid seats={selectedSeats.seats} totalColumns={roomCols} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShowtimeManager;