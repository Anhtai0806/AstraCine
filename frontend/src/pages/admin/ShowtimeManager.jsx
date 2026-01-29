import React, { useEffect, useState } from 'react';
import axiosClient from '../../services/axiosClient';
import SeatGrid from '../../components/admin/SeatGrid';
import './ShowtimeManager.css';

// --- CONFIG ---
const START_HOUR = 7; 
const END_HOUR = 31; // 07:00 hôm sau
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

const ShowtimeManager = () => {
    // --- STATE GLOBAL ---
    const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'calendar'
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // Data
    const [movies, setMovies] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [showtimes, setShowtimes] = useState([]);

    // Modal
    const [modalType, setModalType] = useState(null); // 'create' | 'seat'
    const [selectedSeatsData, setSelectedSeatsData] = useState(null);
    const [createForm, setCreateForm] = useState({ movieId: '', roomId: '', startTime: '' });
    const [roomCols, setRoomCols] = useState(10);

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
        } catch (e) { console.error("Load Error", e); }
    };

    // --- NAVIGATION LOGIC ---
    const handlePrev = () => {
        const d = new Date(currentDate);
        if (viewMode === 'timeline') d.setDate(d.getDate() - 1);
        else d.setMonth(d.getMonth() - 1);
        setCurrentDate(d);
    };

    const handleNext = () => {
        const d = new Date(currentDate);
        if (viewMode === 'timeline') d.setDate(d.getDate() + 1);
        else d.setMonth(d.getMonth() + 1);
        setCurrentDate(d);
    };

    // --- VIEW SEATS LOGIC (FIX LỖI HIỂN THỊ) ---
    const openSeatModal = async (showtime) => {
        try {
            const res = await axiosClient.get(`/admin/showtimes/${showtime.id}/seats`);
            const data = res.data;
            
            // Flatten & Sort
            let flat = data.seatRows.flatMap(r => r.seats).map(s => ({
                ...s, id: s.showtimeSeatId, seatType: s.type, basePrice: s.finalPrice
            }));
            
            flat.sort((a,b) => a.rowLabel.localeCompare(b.rowLabel) || a.columnNumber - b.columnNumber);
            
            // Tính lại số cột thực tế
            const max = Math.max(...flat.map(s => s.columnNumber));
            setRoomCols(max > 0 ? max : 10);
            
            setSelectedSeatsData({...data, seats: flat});
            setModalType('seat');
        } catch  { alert("Lỗi tải ghế!"); }
    };

    // --- CREATE LOGIC ---
    const openCreateModal = (roomId = '', time = '') => {
        setCreateForm({
            movieId: '', 
            roomId: roomId || (rooms[0]?.id || ''), 
            startTime: time
        });
        setModalType('create');
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        try {
            // Nếu đang ở Calendar view mà tạo mới, dùng ngày đang chọn
            // Nếu ở timeline click vào track, nó đã tính ngày rồi.
            // Logic đơn giản: Lấy ngày hiện tại của state
            const dateStr = currentDate.toISOString().split('T')[0];
            
            await axiosClient.post('/admin/showtimes', {
                movieId: createForm.movieId,
                roomId: createForm.roomId,
                startTime: `${dateStr}T${createForm.startTime}:00`
            });
            alert("✅ Thành công!");
            setModalType(null);
            loadData();
        } catch (e) { alert("❌ Lỗi: " + (e.response?.data?.message || "Trùng lịch")); }
    };

    // --- TIMELINE HELPERS ---
    const getPos = (start, dur) => {
        const d = new Date(start);
        let h = d.getHours(); if(h < START_HOUR) h += 24;
        const mins = (h * 60 + d.getMinutes()) - (START_HOUR * 60);
        return {
            left: `${(mins / TOTAL_MINUTES) * 100}%`,
            width: `${((dur + 15) / TOTAL_MINUTES) * 100}%`
        };
    };

    // Click track to create
    const handleTrackClick = (e, roomId) => {
        if (e.target.className !== 'room-track-area') return;
        const rect = e.target.getBoundingClientRect();
        const mins = (e.clientX - rect.left) / rect.width * TOTAL_MINUTES;
        const absMins = (START_HOUR * 60) + mins;
        let h = Math.floor(absMins / 60); if (h>=24) h-=24;
        const m = Math.floor(absMins % 60);
        const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        openCreateModal(roomId, timeStr);
    };

    // --- RENDER HELPERS ---
    const renderTimeline = () => {
        const dateStr = currentDate.toISOString().split('T')[0];
        const daily = showtimes.filter(s => s.startTime.startsWith(dateStr));

        return (
            <div className="timeline-viewport">
                <div className="timeline-grid">
                    {/* Header */}
                    <div className="sticky-header">
                        <div className="corner-header">ROOM / TIME</div>
                        {Array.from({length: END_HOUR - START_HOUR}).map((_, i) => (
                            <div key={i} className="hour-cell">
                                {String((START_HOUR + i) % 24).padStart(2,'0')}:00
                            </div>
                        ))}
                    </div>
                    {/* Body */}
                    {rooms.map(r => (
                        <div key={r.id} className="room-row">
                            <div className="room-sticky-col">
                                <div style={{fontWeight:'700', fontSize:'0.9rem'}}>{r.name}</div>
                                <div style={{fontSize:'0.75rem', color:'#94a3b8'}}>{r.seatCount || 0} ghế</div>
                            </div>
                            <div 
                                className="room-track-area"
                                onClick={(e) => handleTrackClick(e, r.id)}
                                title="Click để thêm suất chiếu"
                            >
                                {daily.filter(s => s.roomId === r.id).map(s => (
                                    <div 
                                        key={s.id}
                                        className={`event-pill clr-${s.movieId % 5}`}
                                        style={getPos(s.startTime, s.movieDuration || 120)}
                                        onClick={(e) => { e.stopPropagation(); openSeatModal(s); }}
                                    >
                                        <div className="ep-time">
                                            {s.startTime.split('T')[1].slice(0,5)} - {s.endTime.split('T')[1].slice(0,5)}
                                        </div>
                                        <div className="ep-title">{s.movieTitle}</div>
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
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0=Sun

        const grid = [];
        // Empty cells
        for(let i=0; i<firstDay; i++) grid.push(<div key={`e-${i}`} className="cal-day empty"/>);
        
        // Days
        for(let d=1; d<=daysInMonth; d++) {
            const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const count = showtimes.filter(s => s.startTime.startsWith(dStr)).length;
            const isToday = new Date().toISOString().startsWith(dStr);
            
            grid.push(
                <div 
                    key={d} 
                    className={`cal-day ${isToday ? 'today' : ''}`}
                    onClick={() => { setCurrentDate(new Date(year, month, d)); setViewMode('timeline'); }}
                >
                    <div className="day-num">
                        {d} {isToday && <span className="today-badge">Today</span>}
                    </div>
                    {count > 0 && (
                        <div className="day-summary">
                            <span className="mini-stat">🎬 {count} suất</span>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="calendar-viewport">
                <div className="cal-grid">
                    {['CN','T2','T3','T4','T5','T6','T7'].map(h => <div key={h} className="cal-head">{h}</div>)}
                    {grid}
                </div>
            </div>
        );
    };

    return (
        <div className="manager-container">
            {/* 1. TOP BAR */}
            <div className="toolbar-wrapper">
                <div className="nav-controls">
                    <div className="view-switcher">
                        <button className={`btn-view ${viewMode==='timeline'?'active':''}`} onClick={()=>setViewMode('timeline')}>Timeline</button>
                        <button className={`btn-view ${viewMode==='calendar'?'active':''}`} onClick={()=>setViewMode('calendar')}>Tháng</button>
                    </div>
                    <div className="date-navigator">
                        <button className="btn-nav-icon" onClick={handlePrev}>‹</button>
                        <span className="current-date-label">
                            {viewMode === 'timeline' 
                                ? currentDate.toLocaleDateString('vi-VN', {weekday:'short', day:'2-digit', month:'2-digit', year:'numeric'})
                                : `Tháng ${currentDate.getMonth()+1}, ${currentDate.getFullYear()}`
                            }
                        </span>
                        <button className="btn-nav-icon" onClick={handleNext}>›</button>
                    </div>
                </div>
                <button className="btn-primary" onClick={() => openCreateModal()}>+ Tạo Lịch</button>
            </div>

            {/* 2. MAIN CONTENT */}
            {viewMode === 'timeline' ? renderTimeline() : renderCalendar()}

            {/* 3. MODAL CREATE */}
            {modalType === 'create' && (
                <div className="modal-overlay" onClick={() => setModalType(null)}>
                    <div className="modal-box" style={{maxWidth:'500px'}} onClick={e=>e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title"><h3>Thêm Suất Chiếu</h3></div>
                            <button className="btn-nav-icon" onClick={()=>setModalType(null)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateSubmit} style={{padding:'24px'}}>
                            <div style={{marginBottom:'16px'}}>
                                <label style={{display:'block',marginBottom:'8px',fontWeight:'600'}}>Phim</label>
                                <select style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #cbd5e1'}}
                                    value={createForm.movieId} onChange={e=>setCreateForm({...createForm, movieId: e.target.value})} required>
                                    <option value="">-- Chọn phim --</option>
                                    {movies.map(m=><option key={m.id} value={m.id}>{m.title} ({m.durationMinutes}p)</option>)}
                                </select>
                            </div>
                            <div style={{marginBottom:'16px'}}>
                                <label style={{display:'block',marginBottom:'8px',fontWeight:'600'}}>Phòng</label>
                                <select style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #cbd5e1'}}
                                    value={createForm.roomId} onChange={e=>setCreateForm({...createForm, roomId: e.target.value})} required>
                                    {rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div style={{marginBottom:'24px'}}>
                                <label style={{display:'block',marginBottom:'8px',fontWeight:'600'}}>Giờ Chiếu</label>
                                <input type="time" style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #cbd5e1'}}
                                    value={createForm.startTime} onChange={e=>setCreateForm({...createForm, startTime: e.target.value})} required />
                            </div>
                            <div style={{display:'flex',justifyContent:'flex-end',gap:'12px'}}>
                                <button type="button" onClick={()=>setModalType(null)} style={{padding:'8px 16px',borderRadius:'6px',border:'1px solid #cbd5e1',background:'white',cursor:'pointer'}}>Hủy</button>
                                <button type="submit" className="btn-primary">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 4. MODAL SEAT VIEW (ĐÃ FIX Z-INDEX) */}
            {modalType === 'seat' && selectedSeatsData && (
                <div className="modal-overlay" onClick={() => setModalType(null)}>
                    <div className="modal-box" onClick={e=>e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">
                                <h3>{selectedSeatsData.movieTitle}</h3>
                                <p>{selectedSeatsData.timeSlotName} • {selectedSeatsData.startTime.replace('T',' ')}</p>
                            </div>
                            <button className="btn-nav-icon" onClick={()=>setModalType(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {/* Component Ghế của bạn */}
                            <SeatGrid 
                                seats={selectedSeatsData.seats} 
                                totalColumns={roomCols} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShowtimeManager;