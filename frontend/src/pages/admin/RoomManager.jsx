import React, { useState, useEffect } from 'react';
import { roomService } from '../../services/roomService';
import SeatGrid from '../../components/admin/SeatGrid';
import './RoomManager.css';

const RoomManager = () => {
    // --- STATE ---
    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [seats, setSeats] = useState([]);
    const [formData, setFormData] = useState({ name: '', totalRows: 10, totalColumns: 12 });
    
    // Batch Logic
    const [pendingChanges, setPendingChanges] = useState(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // --- EFFECT ---
    useEffect(() => { loadRooms(); }, []);

    // --- API ---
    const loadRooms = async () => {
        try {
            const res = await roomService.getAll();
            setRooms(res.data);
        } catch (e) { console.error(e); }
    };

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await roomService.create(formData);
            alert(`✅ Tạo phòng ${res.data.name} thành công!`);
            loadRooms();
            handleSelectRoom(res.data);
            setFormData({ name: '', totalRows: 10, totalColumns: 12 });
        } catch { alert("Lỗi tạo phòng"); } finally { setIsLoading(false); }
    };

    const handleSelectRoom = async (room) => {
        if (pendingChanges.size > 0) {
            if (!window.confirm("Dữ liệu chưa lưu sẽ bị mất. Tiếp tục?")) return;
        }
        setSelectedRoom(room);
        setPendingChanges(new Set());
        try {
            const res = await roomService.getSeats(room.id);
            setSeats(res.data);
        } catch (e) { console.error(e); }
    };

    // --- EDITOR LOGIC ---
    const handleSeatClick = (seat) => {
        const types = ['NORMAL', 'VIP', 'COUPLE', 'PREMIUM'];
        const nextType = types[(types.indexOf(seat.seatType) + 1) % types.length];
        const newSeats = seats.map(s => s.id === seat.id ? { ...s, seatType: nextType } : s);
        setSeats(newSeats);
        
        setPendingChanges(prev => {
            const newSet = new Set(prev);
            newSet.add(seat.id);
            return newSet;
        });
    };

    const handleSave = async () => {
        if (pendingChanges.size === 0) return;
        setIsSaving(true);
        try {
            const updates = seats.filter(s => pendingChanges.has(s.id));
            await Promise.all(updates.map(s => roomService.updateSeatType(s.id, s.seatType)));
            alert("✅ Đã lưu thành công!");
            setPendingChanges(new Set());
        } catch { alert("Lỗi khi lưu!"); } finally { setIsSaving(false); }
    };

    const handleCancel = () => {
        if (window.confirm("Hủy mọi thay đổi?")) handleSelectRoom(selectedRoom);
    };

    // --- RENDER ---
    return (
        <div className="room-manager-layout">
            {/* PANEL TRÁI */}
            <div className="manager-sidebar">
                <div className="sidebar-card">
                    <div className="sidebar-header">✨ Thêm Phòng Mới</div>
                    <form onSubmit={handleCreateRoom}>
                        <input className="form-input" placeholder="Tên phòng (VD: Cinema 01)" required
                            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                        />
                        <div className="form-grid">
                            <input className="form-input" type="number" placeholder="Hàng" min="5"
                                value={formData.totalRows} onChange={e => setFormData({...formData, totalRows: e.target.value})} 
                            />
                            <input className="form-input" type="number" placeholder="Cột" min="5"
                                value={formData.totalColumns} onChange={e => setFormData({...formData, totalColumns: e.target.value})} 
                            />
                        </div>
                        <button disabled={isLoading} className="btn-submit">
                            {isLoading ? 'Đang tạo...' : '+ Tạo Ngay'}
                        </button>
                    </form>
                </div>

                <div className="room-list-container">
                    <div className="list-label">Danh sách phòng</div>
                    {rooms.map(room => (
                        <div key={room.id} className={`room-item ${selectedRoom?.id === room.id ? 'active' : ''}`} onClick={() => handleSelectRoom(room)}>
                            <div style={{fontWeight: 600}}>{room.name}</div>
                            <div style={{fontSize:'0.8rem', opacity: 0.7}}>{room.totalRows}x{room.totalColumns}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* PANEL PHẢI */}
            <div className="manager-editor">
                {selectedRoom ? (
                    <>
                        {/* Header Toolbar */}
                        <div className="editor-toolbar">
                            <div style={{display:'flex', alignItems:'center'}}>
                                <h2 className="room-name">{selectedRoom.name}</h2>
                                <span className={`sync-badge ${pendingChanges.size > 0 ? 'unsaved' : 'saved'}`}>
                                    {pendingChanges.size > 0 ? `⚠️ ${pendingChanges.size} chưa lưu` : '● Đã đồng bộ'}
                                </span>
                            </div>
                            
                            {pendingChanges.size > 0 && (
                                <div className="action-buttons">
                                    <button onClick={handleCancel} className="btn-cancel">Hủy bỏ</button>
                                    <button onClick={handleSave} disabled={isSaving} className="btn-save">
                                        {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Editor Canvas - Chỉ chứa SeatGrid */}
                        <div className="editor-canvas">
                            {/* SeatGrid đã bao gồm màn hình và chú thích bên trong */}
                            <SeatGrid 
                                seats={seats} 
                                totalColumns={selectedRoom.totalColumns} 
                                onSeatClick={handleSeatClick} 
                            />
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <div className="empty-emoji">🍿</div>
                        <h3 style={{fontSize:'1.5rem', margin:0, color:'#374151'}}>Chào mừng trở lại!</h3>
                        <p>Chọn một phòng từ danh sách bên trái để bắt đầu thiết kế.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomManager;