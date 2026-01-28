import React, { useEffect, useState } from 'react';
import axiosClient from '../../services/axiosClient';
import SeatGrid from '../../components/admin/SeatGrid'; // 👈 Import SeatGrid (đảm bảo đúng đường dẫn)
import './ShowtimeManager.css';

const ShowtimeManager = () => {
    // --- 1. STATE QUẢN LÝ DỮ LIỆU ---
    const [movies, setMovies] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [showtimes, setShowtimes] = useState([]);

    // --- 2. STATE FORM ---
    const [formData, setFormData] = useState({
        movieId: '',
        roomId: '',
        showDate: '',
        startTime: ''
    });

    // --- 3. STATE MODAL XEM GHẾ ---
    const [showModal, setShowModal] = useState(false);
    const [selectedShowtimeSeats, setSelectedShowtimeSeats] = useState(null);
    const [currentRoomColumns, setCurrentRoomColumns] = useState(10); // Default 10




    const fetchData = async () => {
        try {
            // Gọi song song 3 API
            const [moviesRes, roomsRes, showtimesRes] = await Promise.all([
                axiosClient.get('/movies'),
                axiosClient.get('/rooms'),
                axiosClient.get('/showtimes')
            ]);

            // console.log("Debug Movies:", moviesRes.data); // Mở cái này nếu vẫn lỗi để soi
            // console.log("Debug Rooms:", roomsRes.data);

            setMovies(moviesRes.data);
            setRooms(roomsRes.data);
            setShowtimes(showtimesRes.data);
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
            alert("Không thể tải dữ liệu từ server.");
        }
    };

    // --- 4. LOAD DỮ LIỆU KHI VÀO TRANG ---
    useEffect(() => {
        fetchData();
    }, []);




    // --- 5. XỬ LÝ FORM ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // --- 6. SUBMIT FORM (TẠO MỚI) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Ghép Date + Time => ISO String (2026-02-15T19:30:00)
            const fullDateTime = `${formData.showDate}T${formData.startTime}:00`;

            const payload = {
                movieId: formData.movieId,
                roomId: formData.roomId,
                startTime: fullDateTime
            };

            await axiosClient.post('/showtimes', payload);

            alert('✅ Tạo lịch chiếu thành công!');

            // Reload danh sách showtime
            const res = await axiosClient.get('/showtimes');
            setShowtimes(res.data);

            // Reset giờ, giữ lại ngày/phòng cho tiện nhập tiếp
            setFormData(prev => ({ ...prev, startTime: '' }));

        } catch (error) {
            console.error(error);
            alert('❌ Lỗi: ' + (error.response?.data?.message || 'Trùng lịch hoặc lỗi server'));
        }
    };

    // --- 7. XÓA LỊCH ---
    const handleDelete = async (e, id) => {
        e.stopPropagation(); // Chặn click vào card (để không mở modal)
        if (!window.confirm("Bạn có chắc muốn HỦY suất chiếu này?")) return;

        try {
            await axiosClient.delete(`/showtimes/${id}`);
            setShowtimes(prev => prev.filter(s => s.id !== id));
        } catch {
            alert("Không thể xóa. Có thể đã có vé bán ra.");
        }
    };



    // --- 8. MỞ MODAL XEM GHẾ (ĐÃ NÂNG CẤP) ---
    const handleViewSeats = async (showtime) => {
        try {
            // 1. Gọi API lấy sơ đồ ghế
            const res = await axiosClient.get(`/showtimes/${showtime.id}/seats`);
            const data = res.data;

            // 2. Làm phẳng mảng ghế (Flatten)
            let flatSeats = data.seatRows.flatMap(row => row.seats).map(seat => ({
                ...seat,
                id: seat.showtimeSeatId,
                seatType: seat.type,
                basePrice: seat.finalPrice
            }));

            // 3. [QUAN TRỌNG] Sắp xếp lại ghế để hiển thị đúng thứ tự (A -> Z, 1 -> N)
            flatSeats.sort((a, b) => {
                // So sánh tên hàng (A vs B)
                const rowCompare = a.rowLabel.localeCompare(b.rowLabel);
                if (rowCompare !== 0) return rowCompare;
                // Nếu cùng hàng thì so sánh số cột (1 vs 2)
                return a.columnNumber - b.columnNumber;
            });

            // 4. [QUAN TRỌNG] Tự động tính số cột thực tế từ dữ liệu ghế
            // Tìm số cột lớn nhất trong tất cả các ghế (VD: ghế A12 -> max là 12)
            const maxColumn = Math.max(...flatSeats.map(s => s.columnNumber));

            // Cập nhật State
            setCurrentRoomColumns(maxColumn > 0 ? maxColumn : 10); // Nếu lỗi thì fallback về 10
            setSelectedShowtimeSeats({
                ...data,
                seats: flatSeats
            });
            setShowModal(true);

        } catch (error) {
            console.error(error);
            alert("Lỗi tải sơ đồ ghế.");
        }
    };

    // --- HELPER: GOM NHÓM THEO NGÀY ---
    const groupedShowtimes = showtimes.reduce((groups, showtime) => {
        // showtime.startTime = "2026-02-15T19:30:00" -> Lấy "2026-02-15"
        const date = showtime.startTime.split('T')[0];
        if (!groups[date]) groups[date] = [];
        groups[date].push(showtime);
        return groups;
    }, {});

    // Sắp xếp ngày mới nhất lên đầu
    const sortedDates = Object.keys(groupedShowtimes).sort().reverse();

    // --- HELPER: PREVIEW THỜI GIAN KẾT THÚC ---
    const getPreviewInfo = () => {
        if (!formData.movieId || !formData.startTime) return null;

        // Tìm phim đang chọn
        const selectedMovie = movies.find(m => m.id === Number(formData.movieId));
        if (!selectedMovie) return null;

        // ✅ FIX LỖI UNKNOWN: Kiểm tra đủ các trường có thể có
        const duration = selectedMovie.durationMinutes || selectedMovie.duration || 120;
        const totalMinutes = duration + 15; // Cộng 15p dọn dẹp

        const [hours, minutes] = formData.startTime.split(':').map(Number);
        const endDate = new Date();
        endDate.setHours(hours, minutes + totalMinutes);

        const endStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

        return { duration, endStr };
    };

    const preview = getPreviewInfo();

    return (
        <div className="showtime-page">
            {/* === PANEL TRÁI: DANH SÁCH === */}
            <div className="panel-left">
                <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>📅 Lịch Chiếu Phim</h3>

                {sortedDates.length === 0 && <p style={{ color: '#94a3b8' }}>Chưa có lịch chiếu nào.</p>}

                {sortedDates.map(date => (
                    <div key={date} className="date-group">
                        <div className="date-header">{date}</div>
                        <div className="showtime-list">
                            {groupedShowtimes[date].map(item => (
                                <div
                                    key={item.id}
                                    className="showtime-card"
                                    onClick={() => handleViewSeats(item)} // Click mở Modal
                                >
                                    <div className="card-header">
                                        <div className="time-badge">
                                            {item.startTime.split('T')[1].slice(0, 5)}
                                            <span style={{ fontWeight: 400, opacity: 0.7 }}>➜</span>
                                            {item.endTime.split('T')[1].slice(0, 5)}
                                        </div>
                                        <div className="room-badge">{item.roomName}</div>
                                    </div>

                                    <div className="movie-title">{item.movieTitle}</div>

                                    <div className="duration-info">
                                        ⏱ {item.movieDuration || 0} phút (+15p dọn)
                                    </div>

                                    <button
                                        className="btn-delete-showtime"
                                        onClick={(e) => handleDelete(e, item.id)}
                                        title="Hủy lịch chiếu"
                                    >✕</button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* === PANEL PHẢI: FORM === */}
            <div className="panel-right">
                <div className="form-card">
                    <div className="form-header">
                        <h3>+ Thêm Suất Chiếu</h3>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* 1. CHỌN PHIM */}
                        <div className="form-group">
                            <label className="label">Chọn Phim</label>
                            <select
                                name="movieId"
                                className="input-field"
                                value={formData.movieId}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">-- Chọn phim --</option>
                                {movies.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {/* ✅ FIX: Kiểm tra durationMinutes trước, rồi đến duration */}
                                        {m.title} ({m.durationMinutes || m.duration || 'Unknown'} phút)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 2. CHỌN PHÒNG */}
                        <div className="form-group">
                            <label className="label">Chọn Phòng</label>
                            <select
                                name="roomId"
                                className="input-field"
                                value={formData.roomId}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">-- Chọn phòng --</option>
                                {rooms.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {/* ✅ FIX: Kiểm tra seatCount, hoặc nhân rows*columns */}
                                        {r.name} - {r.seatCount || (r.rows * r.columns) || 0} ghế
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '15px' }}>
                            {/* 3. NGÀY CHIẾU */}
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="label">Ngày chiếu</label>
                                <input
                                    type="date"
                                    name="showDate"
                                    className="input-field"
                                    value={formData.showDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            {/* 4. GIỜ BẮT ĐẦU */}
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="label">Giờ bắt đầu</label>
                                <input
                                    type="time"
                                    name="startTime"
                                    className="input-field"
                                    value={formData.startTime}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* PREVIEW BOX */}
                        {preview && (
                            <div className="preview-box">
                                ℹ️ Phim dài <b>{preview.duration} phút</b>.<br />
                                Dự kiến kết thúc lúc <b>{preview.endStr}</b> (đã cộng 15p dọn dẹp).
                            </div>
                        )}

                        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                            Lưu Lịch Chiếu
                        </button>
                    </form>
                </div>
            </div>

            {/* === MODAL POPUP XEM GHẾ === */}
            {showModal && selectedShowtimeSeats && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>{selectedShowtimeSeats.movieTitle}</h3>
                                <div style={{ marginTop: '5px', color: '#64748b', fontSize: '0.9rem' }}>
                                    {selectedShowtimeSeats.timeSlotName} •
                                    {selectedShowtimeSeats.startTime.replace('T', ' ')}
                                    <span className="price-tag">
                                        Hệ số giá: x{selectedShowtimeSeats.multiplier}
                                    </span>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            <SeatGrid
                                seats={selectedShowtimeSeats.seats}
                                totalColumns={currentRoomColumns}
                                onSeatClick={(seat) => {
                                    // Alert check giá
                                    alert(`Vị trí: ${seat.rowLabel}${seat.columnNumber}\nLoại: ${seat.seatType}\nGiá bán: ${seat.basePrice.toLocaleString()} đ`);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShowtimeManager;