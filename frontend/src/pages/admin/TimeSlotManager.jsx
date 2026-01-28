import React, { useEffect, useState } from 'react';
import axiosClient from '../../services/axiosClient'; // Đảm bảo đường dẫn đúng
import './TimeSlotManager.css'; // Import CSS vừa tạo

const TimeSlotManager = () => {
    // 1. State lưu danh sách & Form
    const [timeSlots, setTimeSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null); // Để biết đang chọn cái nào (nếu cần sửa sau này)
    
    // State cho Form
    const [formData, setFormData] = useState({
        name: '',
        startTime: '',
        endTime: '',
        priceMultiplier: 1.0,
        status: 'ACTIVE'
    });

    // 2. Fetch dữ liệu khi vào trang
    useEffect(() => {
        fetchTimeSlots();
    }, []);

    const fetchTimeSlots = async () => {
        try {
            const res = await axiosClient.get('/time-slots');
            // Sắp xếp theo giờ bắt đầu cho đẹp
            const sorted = res.data.sort((a, b) => a.startTime.localeCompare(b.startTime));
            setTimeSlots(sorted);
        } catch (error) {
            console.error("Lỗi tải TimeSlot:", error);
        }
    };

    // 3. Xử lý nhập liệu
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // 4. Gửi Form (Tạo mới)
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Gọi API POST
            // startTime/endTime từ input type="time" gửi lên dạng "09:30" 
            // Java LocalTime tự hiểu, không cần thêm ":00"
            await axiosClient.post('/time-slots', formData);
            
            alert('Thêm khung giờ thành công!');
            fetchTimeSlots(); // Load lại list
            
            // Reset form
            setFormData({
                name: '',
                startTime: '',
                endTime: '',
                priceMultiplier: 1.0,
                status: 'ACTIVE'
            });
        } catch (error) {
            console.error(error);
            alert('Lỗi: ' + (error.response?.data?.message || 'Không thể tạo slot'));
        }
    };

    // 5. Xóa TimeSlot
    const handleDelete = async (e, id) => {
        e.stopPropagation(); // Chặn sự kiện click vào card (để không bị chọn nhầm)
        if (window.confirm('Bạn có chắc muốn xóa khung giờ này không?')) {
            try {
                await axiosClient.delete(`/time-slots/${id}`);
                fetchTimeSlots();
            } catch (error) {
                alert('Không thể xóa (Có thể đã có lịch chiếu sử dụng giờ này)');
            }
        }
    };

    return (
        <div className="timeslot-page">
            {/* --- PANEL TRÁI: DANH SÁCH --- */}
            <div className="panel-left">
                <h3>🕒 Danh sách Khung giờ</h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                    Các mốc thời gian chuẩn của rạp
                </p>

                <div className="slot-list">
                    {timeSlots.map(slot => (
                        <div 
                            key={slot.id} 
                            className={`slot-item ${selectedSlot?.id === slot.id ? 'active' : ''}`}
                            onClick={() => setSelectedSlot(slot)} // Chọn để xem (hoặc sửa sau này)
                        >
                            <div className="slot-info">
                                <span className="slot-time">
                                    {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                                </span>
                                {/* Nút xóa nhỏ hiện khi hover */}
                                <button 
                                    className="btn-delete-icon"
                                    onClick={(e) => handleDelete(e, slot.id)}
                                    title="Xóa"
                                >
                                    🗑️
                                </button>
                            </div>
                            <div className="slot-name">
                                {slot.name} • Hệ số giá: x{slot.priceMultiplier}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- PANEL PHẢI: FORM --- */}
            <div className="panel-right">
                <div className="form-card">
                    <div className="form-header">
                        <h3>+ Tạo Khung Giờ Mới</h3>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Tên Ca */}
                        <div className="form-group">
                            <label className="label">Tên hiển thị (VD: Ca Sáng)</label>
                            <input 
                                type="text" 
                                name="name"
                                className="input-field"
                                value={formData.name}
                                onChange={handleInputChange}
                                required 
                                placeholder="Nhập tên khung giờ..."
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '15px' }}>
                            {/* Giờ Bắt Đầu */}
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="label">Bắt đầu</label>
                                <input 
                                    type="time" 
                                    name="startTime"
                                    className="input-field"
                                    value={formData.startTime}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            {/* Giờ Kết Thúc */}
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="label">Kết thúc</label>
                                <input 
                                    type="time" 
                                    name="endTime"
                                    className="input-field"
                                    value={formData.endTime}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Hệ số giá */}
                        <div className="form-group">
                            <label className="label">Hệ số giá vé (Mặc định 1.0)</label>
                            <input 
                                type="number" 
                                step="0.1"
                                min="0.5"
                                max="3.0"
                                name="priceMultiplier"
                                className="input-field"
                                value={formData.priceMultiplier}
                                onChange={handleInputChange}
                            />
                            <small style={{ color: '#64748b' }}>
                                VD: 1.0 là giá thường, 1.2 là tăng 20% (Giờ cao điểm)
                            </small>
                        </div>

                        <button type="submit" className="btn-primary" style={{ marginTop: '20px' }}>
                            Lưu Khung Giờ
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TimeSlotManager;