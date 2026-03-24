import React, { useEffect, useState } from 'react';
import axiosClient from '../../services/axiosClient';
import './TimeSlotManager.css';

const DEFAULT_FORM = {
    id: null,
    name: '',
    startTime: '',
    endTime: '',
    priceMultiplier: 1.0,
    status: 'ACTIVE'
};

const TimeSlotManager = () => {
    const [timeSlots, setTimeSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [formData, setFormData] = useState(DEFAULT_FORM);

    useEffect(() => {
        fetchTimeSlots();
    }, []);

    const fetchTimeSlots = async () => {
        try {
            const res = await axiosClient.get('/admin/time-slots');
            const sorted = [...(res.data || [])].sort((a, b) => a.startTime.localeCompare(b.startTime));
            setTimeSlots(sorted);
        } catch (error) {
            console.error('Lỗi tải TimeSlot:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectSlot = (slot) => {
        setSelectedSlot(slot);
        setFormData({
            id: slot.id,
            name: slot.name || '',
            startTime: slot.startTime || '',
            endTime: slot.endTime || '',
            priceMultiplier: slot.priceMultiplier ?? 1.0,
            status: slot.status || 'ACTIVE'
        });
    };

    const resetForm = () => {
        setSelectedSlot(null);
        setFormData(DEFAULT_FORM);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                startTime: formData.startTime,
                endTime: formData.endTime,
                priceMultiplier: formData.priceMultiplier,
                status: formData.status
            };

            if (formData.id) {
                await axiosClient.put(`/admin/time-slots/${formData.id}`, payload);
                alert('✅ Cập nhật khung giờ thành công!');
            } else {
                await axiosClient.post('/admin/time-slots', payload);
                alert('✅ Tạo khung giờ thành công!');
            }

            await fetchTimeSlots();
            resetForm();
        } catch (error) {
            alert('❌ Lỗi: ' + (error.response?.data?.message || 'Không thể lưu khung giờ'));
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Bạn có chắc muốn xóa khung giờ này không?')) return;

        try {
            await axiosClient.delete(`/admin/time-slots/${id}`);
            if (selectedSlot?.id === id) {
                resetForm();
            }
            await fetchTimeSlots();
        } catch {
            alert('Không thể xóa (có thể khung giờ đang được sử dụng)');
        }
    };

    return (
        <div className="timeslot-page">
            <div className="panel-left">
                <h2 className="panel-title">Khung Giờ Chiếu</h2>
                <p className="panel-subtitle">Quản lý các khung giờ chuẩn của rạp</p>

                <div className="slot-list">
                    {timeSlots.map((slot) => (
                        <div
                            key={slot.id}
                            className={`slot-item ${selectedSlot?.id === slot.id ? 'active' : ''}`}
                            onClick={() => handleSelectSlot(slot)}
                        >
                            <div className="slot-time">
                                <span>{slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}</span>
                                <button
                                    className="btn-delete-icon"
                                    onClick={(e) => handleDelete(e, slot.id)}
                                    title="Xóa"
                                >
                                    🗑️
                                </button>
                            </div>
                            <div className="slot-meta">
                                <span>{slot.name}</span>
                                <span style={{ margin: '0 4px' }}>•</span>
                                <span className="price-badge">x{slot.priceMultiplier} giá vé</span>
                                <span style={{ margin: '0 4px' }}>•</span>
                                <span>{slot.status || 'ACTIVE'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="panel-right">
                <div className="form-card">
                    <div className="form-header">
                        <h3>{formData.id ? 'Chỉnh Sửa Khung Giờ' : 'Thêm Khung Giờ'}</h3>
                        <p>{formData.id ? 'Cập nhật khung giờ đang chọn' : 'Thiết lập thời gian và hệ số giá'}</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="label">Tên hiển thị</label>
                            <input
                                type="text"
                                name="name"
                                className="input-modern"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder="VD: Ca Sáng, Ca Tối..."
                            />
                        </div>

                        <div className="form-group">
                            <label className="label">Khoảng thời gian</label>
                            <div className="time-range-row">
                                <div className="time-group">
                                    <input
                                        type="time"
                                        name="startTime"
                                        className="input-time"
                                        value={formData.startTime}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="time-arrow">→</div>
                                <div className="time-group">
                                    <input
                                        type="time"
                                        name="endTime"
                                        className="input-time"
                                        value={formData.endTime}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="label">Hệ số giá vé (Multiplier)</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0.5"
                                max="3.0"
                                name="priceMultiplier"
                                className="input-modern"
                                value={formData.priceMultiplier}
                                onChange={handleInputChange}
                            />
                            <small className="price-helper">
                                <strong>1.0</strong>: Giá thường • <strong>1.2</strong>: Tăng 20% • <strong>0.8</strong>: Giảm 20%
                            </small>
                        </div>

                        <div className="form-group">
                            <label className="label">Trạng thái</label>
                            <select
                                name="status"
                                className="input-modern"
                                value={formData.status}
                                onChange={handleInputChange}
                            >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="INACTIVE">INACTIVE</option>
                            </select>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-submit">
                                {formData.id ? 'Lưu Thay Đổi' : 'Lưu Khung Giờ Mới'}
                            </button>
                            {formData.id && (
                                <button type="button" className="btn-secondary-soft" onClick={resetForm}>
                                    Tạo Mới
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TimeSlotManager;
