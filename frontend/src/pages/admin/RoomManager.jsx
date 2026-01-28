

import React, { useState, useEffect } from 'react';
import { roomService } from '../../services/roomService'; // Ensure this path is correct
import SeatGrid from '../../components/admin/SeatGrid';
import './RoomManager.css';
const RoomManager = () => {
    // --- STATE ---
    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [seats, setSeats] = useState([]);
    const [formData, setFormData] = useState({ name: '', totalRows: 10, totalColumns: 12 });

    // ✨ New States for Batch Saving
    const [pendingChanges, setPendingChanges] = useState(new Set()); // Tracks modified seat IDs
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingRoom, setIsLoadingRoom] = useState(false); // Loading state for room creation

    // --- EFFECT ---
    useEffect(() => {
        fetchRooms();
    }, []);

    // --- LOGIC ---
    const fetchRooms = async () => {
        try {
            const res = await roomService.getAll();
            setRooms(res.data);
        } catch (err) { console.error("Lỗi load rooms", err); }
    };

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        setIsLoadingRoom(true);
        try {
            const res = await roomService.create(formData);
            alert(`Tạo phòng ${res.data.name} thành công!`);
            fetchRooms();
            handleSelectRoom(res.data); // Automatically select new room
            setFormData({ name: '', totalRows: 10, totalColumns: 12 });
        } catch {
            alert("Lỗi tạo phòng!");
        } finally {
            setIsLoadingRoom(false);
        }
    };

    const handleSelectRoom = async (room) => {
        // Warning if there are unsaved changes
        if (pendingChanges.size > 0) {
            const confirm = window.confirm("Bạn có thay đổi chưa lưu. Có chắc muốn chuyển phòng không?");
            if (!confirm) return;
        }

        setSelectedRoom(room);
        setPendingChanges(new Set()); // Reset pending changes
        try {
            const res = await roomService.getSeats(room.id);
            setSeats(res.data);
        } catch (err) { console.error("Lỗi load ghế", err); }
    };

    // ✨ Modified: Update Local State ONLY (No API call here)
    const handleSeatClick = (seat) => {
        const types = ['NORMAL', 'VIP', 'COUPLE', 'PREMIUM'];
        const nextType = types[(types.indexOf(seat.seatType) + 1) % types.length];

        // 1. Update UI immediately
        const newSeats = seats.map(s => s.id === seat.id ? { ...s, seatType: nextType } : s);
        setSeats(newSeats);

        // 2. Add to pending changes
        setPendingChanges(prev => {
            const newSet = new Set(prev);
            newSet.add(seat.id);
            return newSet;
        });
    };

    // ✨ New: Save All Changes to API
    const handleSaveChanges = async () => {
        if (pendingChanges.size === 0) return;

        setIsSaving(true);
        try {
            // Filter only modified seats
            const seatsToUpdate = seats.filter(s => pendingChanges.has(s.id));

            // Send concurrent requests
            await Promise.all(seatsToUpdate.map(seat =>
                roomService.updateSeatType(seat.id, seat.seatType)
            ));

            alert("✅ Đã lưu tất cả thay đổi thành công!");
            setPendingChanges(new Set()); // Clear pending changes
        } catch (error) {
            console.error("Lỗi lưu ghế:", error);
            alert("❌ Có lỗi xảy ra khi lưu! Đang tải lại dữ liệu cũ...");
            // Reload original data on error
            if (selectedRoom) handleSelectRoom(selectedRoom);
        } finally {
            setIsSaving(false);
        }
    };

    // ✨ New: Cancel/Revert Changes
    const handleCancelChanges = () => {
        if (pendingChanges.size === 0) return;
        if (window.confirm("Bạn muốn hủy mọi thay đổi chưa lưu?")) {
            // Simply re-fetch data from server to revert
            if (selectedRoom) {
                // We call the logic of handleSelectRoom but bypass the confirmation check
                setSelectedRoom(selectedRoom);
                setPendingChanges(new Set());
                roomService.getSeats(selectedRoom.id).then(res => setSeats(res.data));
            }
        }
    };

    return (
        <div className="room-manager-page">
            {/* PANEL TRÁI: FORM & LIST */}
            <div className="panel-left">
                <div className="form-card">
                    <h3> Thêm Phòng</h3>
                    <form onSubmit={handleCreateRoom}>
                        <input className="input-field" placeholder="Tên phòng" required
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                        <div className="row-col-group">
                            <input className="input-field" type="number" placeholder="Hàng" min="5"
                                value={formData.totalRows} onChange={e => setFormData({ ...formData, totalRows: parseInt(e.target.value) })}
                            />
                            <input className="input-field" type="number" placeholder="Cột" min="5"
                                value={formData.totalColumns} onChange={e => setFormData({ ...formData, totalColumns: parseInt(e.target.value) })}
                            />
                        </div>
                        <button disabled={isLoadingRoom} className="btn-primary">
                            {isLoadingRoom ? 'Đang tạo...' : 'Lưu Phòng'}
                        </button>
                    </form>
                </div>

                <div className="room-list">
                    <h3>Danh sách phòng</h3>
                    {rooms.map(room => (
                        <div key={room.id}
                            className={`room-item ${selectedRoom?.id === room.id ? 'active' : ''}`}
                            onClick={() => handleSelectRoom(room)}>
                            {room.name} ({room.totalRows}x{room.totalColumns})
                        </div>
                    ))}
                </div>
            </div>

            {/* PANEL PHẢI: EDITOR */}
            <div className="panel-right">
                {selectedRoom ? (
                    <div className="editor-container">
                        {/* ✨ EDITOR HEADER WITH ACTIONS */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                            borderBottom: '1px solid #eee',
                            paddingBottom: '15px'
                        }}>
                            <div style={{ textAlign: 'left' }}>
                                <h3 style={{ margin: '0 0 5px 0' }}>⚙️ Sơ đồ: {selectedRoom.name}</h3>
                                <small style={{ color: pendingChanges.size > 0 ? '#ef4444' : '#64748b', fontWeight: 500 }}>
                                    {pendingChanges.size > 0
                                        ? `⚠️ Có ${pendingChanges.size} ghế chưa lưu`
                                        : 'Trạng thái: Đã đồng bộ'}
                                </small>
                            </div>

                            {/* Buttons show only when there are changes */}
                            {pendingChanges.size > 0 && (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={handleCancelChanges}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            background: 'white',
                                            cursor: 'pointer',
                                            color: '#64748b',
                                            fontWeight: 600
                                        }}
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        onClick={handleSaveChanges}
                                        disabled={isSaving}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: isSaving ? '#94a3b8' : '#10b981', // Green color
                                            color: 'white',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}
                                    >
                                        {isSaving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <SeatGrid
                            seats={seats}
                            totalColumns={selectedRoom.totalColumns}
                            onSeatClick={handleSeatClick}
                        />
                    </div>
                ) : (
                    <div className="empty-placeholder">
                        <p>👈 Chọn một phòng bên trái để chỉnh sửa ghế</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomManager;