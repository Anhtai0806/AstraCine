import React, { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../services/axiosClient';
import SeatGrid from '../../components/admin/SeatGrid';
import { FiClipboard, FiTrash2, FiPlus, FiFilm } from 'react-icons/fi';
import './ShowtimeManager.css';

const START_HOUR = 7;
const END_HOUR = 31;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;


const formatDateKey = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const roundToQuarter = (minutes) => Math.round(minutes / 15) * 15;

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

const normalizeDateString = (value) => {
    if (!value) return '';
    return String(value).slice(0, 10);
};

const isMovieAvailableOnDate = (movie, scheduleDate) => {
    if (!movie || movie.status === 'STOPPED' || !scheduleDate) return false;

    const releaseDate = normalizeDateString(movie.releaseDate);
    const endDate = normalizeDateString(movie.endDate);

    if (!releaseDate) return false;

    if (scheduleDate < releaseDate) return false;
    if (endDate && scheduleDate > endDate) return false;

    return true;
};

const ShowtimeManager = () => {
    const [view, setView] = useState('timeline');
    const [date, setDate] = useState(new Date());

    const [movies, setMovies] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [showtimes, setShowtimes] = useState([]);

    const [modal, setModal] = useState(null);
    const [createForm, setCreateForm] = useState({ id: null, movieId: '', roomId: '', startTime: '', date: '' });
    const [bulkForm, setBulkForm] = useState({ movieId: '', roomId: '', startDate: '', endDate: '', startTimes: [], bufferMinutes: 15, newTime: '' });
    const [bulkResult, setBulkResult] = useState(null);
    const [selectedSeats, setSelectedSeats] = useState(null);
    const [roomCols, setRoomCols] = useState(10);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const activeMovies = useMemo(() => movies.filter((movie) => movie.status !== 'STOPPED'), [movies]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [movieRes, roomRes, showtimeRes] = await Promise.all([
                axiosClient.get('/admin/movies'),
                axiosClient.get('/admin/rooms/active'),
                axiosClient.get('/admin/showtimes')
            ]);

            setMovies(movieRes.data || []);
            setRooms(roomRes.data || []);
            setShowtimes(showtimeRes.data || []);
        } catch (error) {
            alert(getErrorMessage(error, 'Không thể tải dữ liệu lịch chiếu'));
        } finally {
            setLoading(false);
        }
    };

    const generateCalendarGrid = (currentDate) => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        return Array.from({ length: 42 }, (_, index) => {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + index);
            return day;
        });
    };

    const getTimelineStyle = (startStr, duration) => {
        const dateValue = new Date(startStr);
        let hour = dateValue.getHours();
        if (hour < START_HOUR) hour += 24;

        const startMinutes = (hour * 60 + dateValue.getMinutes()) - START_HOUR * 60;
        const left = (startMinutes / TOTAL_MINUTES) * 100;
        const width = ((duration + 15) / TOTAL_MINUTES) * 100;

        return { left: `${left}%`, width: `${width}%` };
    };

    const handleNav = (direction) => {
        const newDate = new Date(date);
        if (view === 'timeline') newDate.setDate(newDate.getDate() + direction);
        else newDate.setMonth(newDate.getMonth() + direction);
        setDate(newDate);
    };

    const openCreateModal = (roomId = rooms[0]?.id || '', time = '') => {
        setCreateForm({
            id: null,
            movieId: '',
            roomId,
            startTime: time,
            date: formatDateKey(date),
        });
        setModal({ type: 'create' });
    };

    const openEditModal = (showtime) => {
        setCreateForm({
            id: showtime.id,
            movieId: String(showtime.movieId),
            roomId: String(showtime.roomId),
            startTime: showtime.startTime.split('T')[1]?.slice(0, 5) || '',
            date: showtime.startTime.split('T')[0],
        });
        setModal({ type: 'create' });
    };

    const handleTrackClick = (event, roomId) => {
        if (event.target.className !== 'tl-track') return;
        const rect = event.target.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        const rawMinutes = percent * TOTAL_MINUTES + START_HOUR * 60;
        const roundedMinutes = roundToQuarter(rawMinutes);
        let hour = Math.floor(roundedMinutes / 60);
        const minute = roundedMinutes % 60;
        if (hour >= 24) hour -= 24;
        openCreateModal(String(roomId), `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    };

    const handleCreateSubmit = async (event) => {
        event.preventDefault();
        try {
            const payload = {
                movieId: Number(createForm.movieId),
                roomId: Number(createForm.roomId),
                startTime: `${createForm.date}T${createForm.startTime}:00`,
            };

            if (createForm.id) {
                await axiosClient.put(`/admin/showtimes/${createForm.id}`, payload);
                alert('Đã cập nhật suất chiếu');
            } else {
                await axiosClient.post('/admin/showtimes', payload);
                alert('Đã tạo lịch chiếu');
            }

            setModal(null);
            await loadData();
        } catch (error) {
            alert(getErrorMessage(error, 'Không thể lưu suất chiếu'));
        }
    };

    const handleDeleteShowtime = async () => {
        if (!createForm.id) return;
        if (!window.confirm('Bạn có chắc muốn xóa suất chiếu này?')) return;

        try {
            await axiosClient.delete(`/admin/showtimes/${createForm.id}`);
            alert('Đã xóa suất chiếu');
            setModal(null);
            await loadData();
        } catch (error) {
            alert(getErrorMessage(error, 'Không thể xóa suất chiếu'));
        }
    };

    const handleDeleteDayShowtimes = async () => {
        const scheduleDate = formatDateKey(date);
        const dayShowtimes = showtimes.filter((showtime) => showtime.startTime.startsWith(scheduleDate));

        if (!dayShowtimes.length) {
            alert('Không có lịch chiếu nào trong ngày được chọn');
            return;
        }

        if (!window.confirm(`Bạn có chắc muốn xóa toàn bộ ${dayShowtimes.length} suất chiếu trong ngày ${scheduleDate}?`)) {
            return;
        }

        try {
            await axiosClient.delete('/admin/showtimes', { params: { scheduleDate } });
            alert('Đã xóa toàn bộ lịch chiếu trong ngày');
            setModal(null);
            await loadData();
        } catch (error) {
            alert(getErrorMessage(error, 'Không thể xóa toàn bộ lịch chiếu trong ngày'));
        }
    };


    const openBulkModal = () => {
        setBulkForm({ movieId: '', roomId: rooms[0]?.id || '', startDate: formatDateKey(date), endDate: '', startTimes: [], bufferMinutes: 15, newTime: '' });
        setBulkResult(null);
        setModal({ type: 'bulk' });
    };

    const addBulkTime = () => {
        if (!bulkForm.newTime) return;
        if (bulkForm.startTimes.includes(bulkForm.newTime)) return;
        setBulkForm(prev => ({ ...prev, startTimes: [...prev.startTimes, prev.newTime].sort(), newTime: '' }));
    };

    const removeBulkTime = (time) => {
        setBulkForm(prev => ({ ...prev, startTimes: prev.startTimes.filter(t => t !== time) }));
    };

    const handleBulkSubmit = async (event) => {
        event.preventDefault();
        if (!bulkForm.startTimes.length) { alert('Phải thêm ít nhất một khung giờ'); return; }
        try {
            setLoading(true);
            const payload = {
                movieId: Number(bulkForm.movieId),
                roomId: Number(bulkForm.roomId),
                startDate: bulkForm.startDate,
                endDate: bulkForm.endDate,
                startTimes: bulkForm.startTimes,
                bufferMinutes: Number(bulkForm.bufferMinutes) || 15,
            };
            const response = await axiosClient.post('/admin/showtimes/bulk', payload);
            setBulkResult(response.data);
            await loadData();
        } catch (error) {
            alert(getErrorMessage(error, 'Không thể tạo lịch hàng loạt'));
        } finally {
            setLoading(false);
        }
    };

    const openSeatModal = async (showtime) => {
        try {
            const response = await axiosClient.get(`/admin/showtimes/${showtime.id}/seats`);
            const data = response.data;
            const flatSeats = data.seatRows.flatMap((row) => row.seats).map((seat) => ({
                ...seat,
                id: seat.showtimeSeatId,
                seatType: seat.type,
                basePrice: seat.finalPrice,
            }));

            flatSeats.sort((a, b) => a.rowLabel.localeCompare(b.rowLabel) || a.columnNumber - b.columnNumber);
            const maxColumns = Math.max(...flatSeats.map((seat) => seat.columnNumber), 10);

            setRoomCols(maxColumns);
            setSelectedSeats({ ...data, seats: flatSeats });
            setModal({ type: 'seat', movieTitle: data.movieTitle });
        } catch (error) {
            alert(getErrorMessage(error, 'Không thể tải sơ đồ ghế'));
        }
    };

    const renderTimeline = () => {
        const dateKey = formatDateKey(date);
        const todaysShowtimes = showtimes.filter((showtime) => showtime.startTime.startsWith(dateKey));

        return (
            <div className="timeline-wrapper">
                <div className="timeline-body">
                    <div className="tl-header-row">
                        <div className="tl-corner">Phòng / Giờ</div>
                        <div className="tl-hours">
                            {Array.from({ length: END_HOUR - START_HOUR }).map((_, index) => (
                                <div key={index} className="tl-hour-cell">
                                    {String((START_HOUR + index) % 24).padStart(2, '0')}:00
                                </div>
                            ))}
                        </div>
                    </div>

                    {rooms.map((room) => (
                        <div key={room.id} className="tl-room-row">
                            <div className="tl-room-info">
                                <div className="tl-room-name">{room.name}</div>
                                <div className="tl-room-cap">
                                    {room.seatCount || (room.totalRows * room.totalColumns) || 0} ghế
                                </div>
                            </div>
                            <div
                                className="tl-track"
                                onClick={(event) => handleTrackClick(event, room.id)}
                                title="Click để tạo suất chiếu"
                            >
                                {todaysShowtimes
                                    .filter((showtime) => showtime.roomId === room.id)
                                    .map((showtime) => (
                                        <div
                                            key={showtime.id}
                                            className={`show-card c-${showtime.movieId % 5}`}
                                            style={getTimelineStyle(showtime.startTime, showtime.movieDuration || 120)}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                openEditModal(showtime);
                                            }}
                                        >
                                            <div className="show-card-title">{showtime.movieTitle}</div>
                                            <div className="show-card-time">
                                                {showtime.startTime.split('T')[1].slice(0, 5)} - {showtime.endTime.split('T')[1].slice(0, 5)}
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
                        {['CN', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'].map((day) => (
                            <div key={day} className="cal-weekday">{day}</div>
                        ))}
                    </div>
                    <div className="cal-grid">
                        {days.map((day, index) => {
                            const dayKey = formatDateKey(day);
                            const isCurrentMonth = day.getMonth() === date.getMonth();
                            const isToday = formatDateKey(new Date()) === dayKey;
                            const count = showtimes.filter((showtime) => showtime.startTime.startsWith(dayKey)).length;

                            return (
                                <div
                                    key={index}
                                    className={`cal-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                                    onClick={() => {
                                        setDate(day);
                                        setView('timeline');
                                    }}
                                >
                                    <div className="day-num">{day.getDate()}</div>
                                    {count > 0 && (
                                        <div className="day-dots">
                                            {Array.from({ length: Math.min(count, 5) }).map((_, dotIndex) => (
                                                <div key={dotIndex} className="dot" />
                                            ))}
                                            {count > 5 && <span className="more-tag">+{count - 5}</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="app-container">
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
                            : `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`}
                    </div>
                    <button className="nav-btn" onClick={() => handleNav(1)}>›</button>
                </div>

                <div className="header-actions">
                    <button className="btn-bulk" onClick={openBulkModal}>
                        <FiClipboard size={16} /> Bulk Create
                    </button>
                    <button className="btn-danger-soft" onClick={handleDeleteDayShowtimes}>
                        <FiTrash2 size={16} /> Xóa Lịch Trong Ngày
                    </button>
                    <button className="btn-create" onClick={() => openCreateModal()}>
                        <FiPlus size={18} /> Tạo Mới
                    </button>
                </div>
            </div>

            {loading ? <div className="empty-state">Đang tải dữ liệu lịch chiếu...</div> : view === 'timeline' ? renderTimeline() : renderCalendar()}

            {modal?.type === 'create' && (
                <div className="showtime-modal-backdrop" onClick={() => setModal(null)}>
                    <div className="modal-panel create-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="create-modal-header">
                            <div className="create-modal-header-icon">
                                <FiFilm color="#c7d2fe" />
                            </div>
                            <div>
                                <h3>{createForm.id ? 'Cập Nhật Suất Chiếu' : 'Thêm Suất Chiếu Mới'}</h3>
                                <p className="create-modal-subtitle">Tăng tốc thao tác admin với tạo, sửa, xóa ngay trên timeline</p>
                            </div>
                            <button className="create-modal-close" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <div className="create-modal-body">
                            <form onSubmit={handleCreateSubmit}>
                                <div className="create-section-label">Thông tin phim</div>
                                <div className="create-form-group">
                                    <label className="create-form-label">Chọn Phim</label>
                                    <select
                                        className="create-form-select"
                                        value={createForm.movieId}
                                        onChange={(event) => setCreateForm({ ...createForm, movieId: event.target.value })}
                                        required
                                    >
                                        <option value="">-- Chọn phim --</option>
                                        {activeMovies.map((movie) => (
                                            <option key={movie.id} value={movie.id}>{movie.title}</option>
                                        ))}
                                    </select>
                                    {!activeMovies.length && (
                                        <div className="info-note">
                                            Khong co phim nao phu hop voi ngay da chon.
                                        </div>
                                    )}
                                </div>
                                <div className="create-form-group">
                                    <label className="create-form-label">Phòng Chiếu</label>
                                    <select
                                        className="create-form-select"
                                        value={createForm.roomId}
                                        onChange={(event) => setCreateForm({ ...createForm, roomId: event.target.value })}
                                        required
                                    >
                                        <option value="">-- Chọn phòng --</option>
                                        {rooms.map((room) => (
                                            <option key={room.id} value={room.id}>{room.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="create-form-divider"></div>
                                <div className="create-section-label">Thời gian chiếu</div>

                                <div className="create-form-row">
                                    <div className="create-form-group">
                                        <label className="create-form-label">Ngày Chiếu</label>
                                        <input
                                            type="date"
                                            className="create-form-input"
                                            value={createForm.date}
                                            onChange={(event) => setCreateForm({ ...createForm, date: event.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="create-form-group">
                                        <label className="create-form-label">Giờ Bắt Đầu</label>
                                        <input
                                            type="time"
                                            step="900"
                                            className="create-form-input"
                                            value={createForm.startTime}
                                            onChange={(event) => setCreateForm({ ...createForm, startTime: event.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="info-note">
                                    Hệ thống sẽ tự động đảm bảo phòng không trùng lịch, có 15 phút dọn dẹp và không để 1 phòng chiếu cùng phim liên tiếp.
                                </div>

                                <div className="modal-action-row">
                                    <button type="submit" className="create-form-submit">
                                        {createForm.id ? 'Lưu Thay Đổi' : 'Tạo Lịch Chiếu'}
                                    </button>
                                    {createForm.id && (
                                        <>
                                            <button type="button" className="btn-outline" onClick={() => openSeatModal({ id: createForm.id })}>
                                                Xem Ghế
                                            </button>
                                            <button type="button" className="btn-danger" onClick={handleDeleteShowtime}>
                                                Xóa
                                            </button>
                                        </>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}


            {modal?.type === 'seat' && selectedSeats && (
                <div className="showtime-modal-backdrop" onClick={() => setModal(null)}>
                    <div className="modal-panel seat-modal-panel" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-head">
                            <h3>{selectedSeats.movieTitle}</h3>
                            <button className="nav-btn" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <div className="modal-content seat-modal-content">
                            <SeatGrid seats={selectedSeats.seats} totalColumns={roomCols} showPrice />
                        </div>
                    </div>
                </div>
            )}

            {modal?.type === 'bulk' && (
                <div className="showtime-modal-backdrop" onClick={() => setModal(null)}>
                    <div className="modal-panel create-modal auto-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="create-modal-header">
                            <div className="create-modal-header-icon">
                                <FiClipboard color="#c7d2fe" />
                            </div>
                            <div>
                                <h3>Bulk Create — Tạo Lịch Hàng Loạt</h3>
                                <p className="create-modal-subtitle">Chọn 1 phim, 1 phòng, khoảng ngày và các khung giờ để tạo hàng loạt suất chiếu</p>
                            </div>
                            <button className="create-modal-close" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <div className="create-modal-body">
                            <form onSubmit={handleBulkSubmit}>
                                <div className="create-section-label">Phim & Phòng</div>
                                <div className="create-form-row">
                                    <div className="create-form-group">
                                        <label className="create-form-label">Chọn Phim</label>
                                        <select className="create-form-select" value={bulkForm.movieId} onChange={(e) => setBulkForm({ ...bulkForm, movieId: e.target.value })} required>
                                            <option value="">-- Chọn phim --</option>
                                            {activeMovies.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                                        </select>
                                    </div>
                                    <div className="create-form-group">
                                        <label className="create-form-label">Phòng Chiếu</label>
                                        <select className="create-form-select" value={bulkForm.roomId} onChange={(e) => setBulkForm({ ...bulkForm, roomId: e.target.value })} required>
                                            <option value="">-- Chọn phòng --</option>
                                            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="create-form-divider"></div>
                                <div className="create-section-label">Giai đoạn</div>
                                <div className="create-form-row">
                                    <div className="create-form-group">
                                        <label className="create-form-label">Từ ngày</label>
                                        <input type="date" className="create-form-input" value={bulkForm.startDate} onChange={(e) => setBulkForm({ ...bulkForm, startDate: e.target.value })} required />
                                    </div>
                                    <div className="create-form-group">
                                        <label className="create-form-label">Đến ngày</label>
                                        <input type="date" className="create-form-input" value={bulkForm.endDate} onChange={(e) => setBulkForm({ ...bulkForm, endDate: e.target.value })} required />
                                    </div>
                                    <div className="create-form-group">
                                        <label className="create-form-label">Buffer (phút)</label>
                                        <input type="number" className="create-form-input" value={bulkForm.bufferMinutes} onChange={(e) => setBulkForm({ ...bulkForm, bufferMinutes: e.target.value })} min="0" max="60" />
                                    </div>
                                </div>

                                <div className="create-form-divider"></div>
                                <div className="create-section-label">Khung giờ trong ngày</div>
                                <div className="manual-input-row" style={{ marginBottom: 8 }}>
                                    <input type="time" step="900" className="create-form-input" value={bulkForm.newTime} onChange={(e) => setBulkForm({ ...bulkForm, newTime: e.target.value })} />
                                    <button type="button" className="btn-secondary" onClick={addBulkTime}>+ Thêm</button>
                                </div>
                                {bulkForm.startTimes.length > 0 && (
                                    <div className="selection-grid" style={{ marginBottom: 8 }}>
                                        {bulkForm.startTimes.map((t) => (
                                            <div key={t} className="selection-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'default' }}>
                                                <span style={{ fontWeight: 700 }}>🕐 {t}</span>
                                                <button type="button" onClick={() => removeBulkTime(t)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.1rem', cursor: 'pointer', padding: '0 4px' }}>✕</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {!bulkForm.startTimes.length && <div className="info-note">Chưa thêm khung giờ nào. Hãy chọn giờ và nhấn "+ Thêm".</div>}

                                {bulkResult && (
                                    <div style={{ marginBottom: 16 }}>
                                        <div className={`toast ${bulkResult.createdCount > 0 ? 'toast-success' : 'toast-error'}`} style={{ marginBottom: 8 }}>
                                            <span>{bulkResult.createdCount > 0 ? '🎉' : '⚠️'}</span> {bulkResult.message}
                                        </div>
                                        {bulkResult.skippedReasons?.length > 0 && (
                                            <details style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Xem {bulkResult.skippedCount} khung giờ bị bỏ qua</summary>
                                                <ul style={{ marginTop: 6, paddingLeft: 20 }}>
                                                    {bulkResult.skippedReasons.map((r, i) => <li key={i}>{r}</li>)}
                                                </ul>
                                            </details>
                                        )}
                                    </div>
                                )}

                                <button type="submit" className="create-form-submit" disabled={loading || !bulkForm.startTimes.length || !bulkForm.movieId || !bulkForm.roomId}>
                                    {loading ? '⏳ Đang tạo...' : `📋 Tạo Hàng Loạt (${bulkForm.startTimes.length} khung giờ/ngày)`}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShowtimeManager;
