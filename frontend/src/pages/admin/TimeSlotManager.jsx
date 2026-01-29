import React, { useEffect, useState } from 'react';
import axiosClient from '../../services/axiosClient';
import './TimeSlotManager.css';

const TimeSlotManager = () => {
    // --- STATE ---
    const [timeSlots, setTimeSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [formData, setFormData] = useState({
        name: '', startTime: '', endTime: '', priceMultiplier: 1.0, status: 'ACTIVE'
    });

    // --- EFFECT ---
    useEffect(() => { fetchTimeSlots(); }, []);

    const fetchTimeSlots = async () => {
        try {
            const res = await axiosClient.get('/admin/time-slots');
            const sorted = res.data.sort((a, b) => a.startTime.localeCompare(b.startTime));
            setTimeSlots(sorted);
        } catch (error) { console.error("Lỗi tải TimeSlot:", error); }
    };

    // --- HANDLERS ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axiosClient.post('/admin/time-slots', formData);
            alert('✅ Tạo khung giờ thành công!');
            fetchTimeSlots();
            setFormData({ name: '', startTime: '', endTime: '', priceMultiplier: 1.0, status: 'ACTIVE' });
        } catch (error) {
            alert('❌ Lỗi: ' + (error.response?.data?.message || 'Không thể tạo slot'));
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm('Bạn có chắc muốn xóa khung giờ này không?')) {
            try {
                await axiosClient.delete(`/admin/time-slots/${id}`);
                fetchTimeSlots();
            } catch { alert('Không thể xóa (Có thể đang được sử dụng)'); }
        }
    };

    return (
        <div className="timeslot-page">
            
            {/* --- CỘT TRÁI: DANH SÁCH --- */}
            <div className="panel-left">
                <h2 className="panel-title">Khung Giờ Chiếu</h2>
                <p className="panel-subtitle">Quản lý các suất chiếu chuẩn của rạp</p>

                <div className="slot-list">
                    {timeSlots.map(slot => (
                        <div key={slot.id} 
                             className={`slot-item ${selectedSlot?.id === slot.id ? 'active' : ''}`}
                             onClick={() => setSelectedSlot(slot)}>
                            <div className="slot-time">
                                <span>{slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}</span>
                                <button className="btn-delete-icon" onClick={(e) => handleDelete(e, slot.id)} title="Xóa">🗑️</button>
                            </div>
                            <div className="slot-meta">
                                <span>{slot.name}</span>
                                <span style={{margin:'0 4px'}}>•</span>
                                <span className="price-badge">x{slot.priceMultiplier} giá vé</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- CỘT PHẢI: FORM (ĐẸP) --- */}
            <div className="panel-right">
                <div className="form-card">
                    <div className="form-header">
                        <h3>✨ Thêm Khung Giờ</h3>
                        <p>Thiết lập thời gian và hệ số giá</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Tên Ca */}
                        <div className="form-group">
                            <label className="label">Tên hiển thị</label>
                            <input type="text" name="name" className="input-modern"
                                value={formData.name} onChange={handleInputChange}
                                required placeholder="VD: Ca Sáng, Ca Tối..." 
                            />
                        </div>

                        {/* Thời gian (Gom nhóm đẹp) */}
                        <div className="form-group">
                            <label className="label">Khoảng thời gian</label>
                            <div className="time-range-row">
                                <div className="time-group">
                                    <input type="time" name="startTime" className="input-time"
                                        value={formData.startTime} onChange={handleInputChange} required 
                                    />
                                </div>
                                <div className="time-arrow">➜</div>
                                <div className="time-group">
                                    <input type="time" name="endTime" className="input-time"
                                        value={formData.endTime} onChange={handleInputChange} required 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Hệ số giá */}
                        <div className="form-group">
                            <label className="label">Hệ số giá vé (Multiplier)</label>
                            <input type="number" step="0.1" min="0.5" max="3.0"
                                name="priceMultiplier" className="input-modern"
                                value={formData.priceMultiplier} onChange={handleInputChange} 
                            />
                            <small className="price-helper">
                                💡 <strong>1.0</strong>: Giá thường • <strong>1.2</strong>: Tăng 20% (Giờ cao điểm) • <strong>0.8</strong>: Giảm 20%
                            </small>
                        </div>

                        <button type="submit" className="btn-submit">Lưu Khung Giờ Mới</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TimeSlotManager;