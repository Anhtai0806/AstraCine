import React, { useState, useEffect, useRef } from 'react';
import { roomService } from '../../services/roomService';
import SeatGrid from '../../components/admin/SeatGrid';
import './RoomManager.css';
import { FaPencilAlt, FaPlus, FaCircle, FaExclamationTriangle, FaCheckCircle, FaSave } from "react-icons/fa";
import { VscLock } from "react-icons/vsc";
import { FaUnlockKeyhole } from "react-icons/fa6";
import { RiDeleteBin6Line, RiMovie2Line } from "react-icons/ri";

const CustomScreenTypeSelect = ({ value, onChange, options, onAdd, onRemove }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newType, setNewType] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`custom-select-container ${isOpen ? 'open' : ''}`} ref={dropdownRef}>
            <div className="custom-select-trigger form-input" onClick={() => setIsOpen(!isOpen)}>
                {value || 'Chọn loại màn hình'}
                <span className="dropdown-arrow">▼</span>
            </div>
            {isOpen && (
                <div className="custom-select-menu">
                    <ul className="custom-select-list">
                        {options.map(opt => (
                            <li key={opt} className={`custom-select-item ${value === opt ? 'selected' : ''}`}>
                                <span onClick={() => { onChange(opt); setIsOpen(false); }} className="custom-select-text">
                                    {opt}
                                </span>
                                <button type="button" className="custom-select-delete" onClick={(e) => { e.stopPropagation(); onRemove(opt); }} title="Xóa loại này">
                                    ✕
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="custom-select-add">
                        <input 
                            type="text" 
                            placeholder="Nhập loại mới..." 
                            value={newType} 
                            onChange={e => setNewType(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if(newType.trim()) { onAdd(newType.trim()); setNewType(''); }
                                }
                            }}
                        />
                        <button type="button" onClick={(e) => {
                             e.preventDefault();
                             if(newType.trim()) { onAdd(newType.trim()); setNewType(''); }
                        }}>Thêm</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const RoomManager = () => {
    // --- STATE ---
    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [seats, setSeats] = useState([]);
    const [formData, setFormData] = useState({ name: '', totalRows: 10, totalColumns: 12, screenType: '2D', priceMultiplier: 1.0 });

    const defaultScreenTypes = ['2D', '3D', 'IMAX', '4DX', 'ScreenX'];
    const [screenTypesList, setScreenTypesList] = useState(() => {
        const saved = localStorage.getItem('astra_screen_types');
        return saved ? JSON.parse(saved) : defaultScreenTypes;
    });

    const updateScreenTypesList = (newList) => {
        setScreenTypesList(newList);
        localStorage.setItem('astra_screen_types', JSON.stringify(newList));
    };

    const addScreenType = (type) => {
        if (!type || screenTypesList.includes(type)) return;
        updateScreenTypesList([...screenTypesList, type]);
    };

    const removeScreenType = (type) => {
        updateScreenTypesList(screenTypesList.filter(t => t !== type));
    };

    // Batch Logic
    const [pendingChanges, setPendingChanges] = useState(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Edit Modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({ name: '', screenType: '', priceMultiplier: 1.0 });

    // Delete Dialog
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    // Toast notifications
    const [toast, setToast] = useState(null);

    // --- EFFECT ---
    useEffect(() => { loadRooms(); }, []);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

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
            showToast(`✅ Tạo phòng "${res.data.name}" thành công!`);
            loadRooms();
            handleSelectRoom(res.data);
            setFormData({ name: '', totalRows: 10, totalColumns: 12, screenType: '2D', priceMultiplier: 1.0 });
        } catch { showToast("Lỗi tạo phòng", 'error'); } finally { setIsLoading(false); }
    };

    const handleSelectRoom = async (room) => {
        if (pendingChanges.size > 0) {
            if (!window.confirm("Dữ liệu chưa lưu sẽ bị mất. Tiếp tục?")) return;
        }
        setSelectedRoom(room);
        setPendingChanges(new Set());
        setDeleteError(null);
        try {
            const res = await roomService.getSeats(room.id);
            setSeats(res.data);
        } catch (e) { console.error(e); }
    };

    // --- EDIT ROOM ---
    const openEditModal = () => {
        if (!selectedRoom) return;
        setEditFormData({
            name: selectedRoom.name,
            screenType: selectedRoom.screenType || '2D',
            priceMultiplier: selectedRoom.priceMultiplier || 1.0
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await roomService.update(selectedRoom.id, editFormData);
            showToast(`✅ Cập nhật phòng "${res.data.name}" thành công!`);
            setSelectedRoom(res.data);
            setShowEditModal(false);
            loadRooms();
        } catch { showToast("Lỗi cập nhật phòng", 'error'); }
    };

    // --- DEACTIVATE / ACTIVATE ---
    const handleToggleStatus = async () => {
        if (!selectedRoom) return;

        const isActive = selectedRoom.status === 'ACTIVE';
        const action = isActive ? 'ngưng hoạt động' : 'kích hoạt lại';

        if (!window.confirm(`Bạn có chắc muốn ${action} phòng "${selectedRoom.name}"?`)) return;

        try {
            const res = isActive
                ? await roomService.deactivate(selectedRoom.id)
                : await roomService.activate(selectedRoom.id);
            showToast(`✅ Đã ${action} phòng "${res.data.name}" thành công!`);
            setSelectedRoom(res.data);
            loadRooms();
        } catch (err) {
            const errorData = err.response?.data;
            if (errorData?.error === 'ROOM_HAS_FUTURE_SHOWTIMES') {
                showToast(`❌ ${errorData.message}`, 'error');
            } else {
                showToast(`Lỗi khi ${action} phòng`, 'error');
            }
        }
    };

    // --- HARD DELETE ---
    const handleDeleteClick = () => {
        setDeleteError(null);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await roomService.hardDelete(selectedRoom.id);
            showToast(`✅ Đã xóa phòng "${selectedRoom.name}" vĩnh viễn!`);
            setSelectedRoom(null);
            setSeats([]);
            setShowDeleteConfirm(false);
            loadRooms();
        } catch (err) {
            const errorData = err.response?.data;
            if (errorData?.error === 'ROOM_HAS_HISTORY') {
                setDeleteError(errorData.message);
            } else {
                showToast("Lỗi khi xóa phòng", 'error');
                setShowDeleteConfirm(false);
            }
        }
    };

    const handleDeactivateFromDeleteDialog = async () => {
        try {
            const res = await roomService.deactivate(selectedRoom.id);
            showToast(`✅ Đã ngưng hoạt động phòng "${res.data.name}" thành công!`);
            setSelectedRoom(res.data);
            setShowDeleteConfirm(false);
            setDeleteError(null);
            loadRooms();
        } catch (err) {
            const errorData = err.response?.data;
            if (errorData?.error === 'ROOM_HAS_FUTURE_SHOWTIMES') {
                showToast(`❌ ${errorData.message}`, 'error');
            } else {
                showToast("Lỗi khi ngưng hoạt động phòng", 'error');
            }
        }
    };

    // --- SEAT EDITOR LOGIC ---
    const handleSeatClick = (seat) => {
        // Prevent editing COUPLE seat or converting to it
        if (seat.seatType === 'COUPLE') {
            showToast("Không thể chuyển đổi ghế đôi sang loại ghế khác.", 'error');
            return;
        }

        const types = ['NORMAL', 'VIP', 'PREMIUM'];
        const currentTypeIndex = types.indexOf(seat.seatType);
        const nextType = currentTypeIndex !== -1
            ? types[(currentTypeIndex + 1) % types.length]
            : types[0];

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
            showToast("✅ Đã lưu thành công!");
            setPendingChanges(new Set());
            const res = await roomService.getSeats(selectedRoom.id);
            setSeats(res.data);
        } catch { showToast("Lỗi khi lưu!", 'error'); } finally { setIsSaving(false); }
    };

    const handleCancel = () => {
        if (window.confirm("Hủy mọi thay đổi?")) handleSelectRoom(selectedRoom);
    };

    return (
        <div className="room-manager-layout">
            {/* TOAST NOTIFICATION */}
            {toast && (
                <div className={`toast-notification toast-${toast.type}`}>
                    {toast.message}
                </div>
            )}

            {/* PANEL TRÁI */}
            <div className="manager-sidebar">
                <div className="sidebar-card">
                    <div className="sidebar-header"><FaPlus /> Thêm Phòng Mới</div>
                    <form onSubmit={handleCreateRoom}>
                        <input className="form-input" placeholder="Tên phòng (VD: Cinema 01)" required
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                        <div className="form-grid">
                            <input className="form-input" type="number" placeholder="Hàng" min="5"
                                value={formData.totalRows} onChange={e => setFormData({ ...formData, totalRows: e.target.value })}
                            />
                            <input className="form-input" type="number" placeholder="Cột" min="5"
                                value={formData.totalColumns} onChange={e => setFormData({ ...formData, totalColumns: e.target.value })}
                            />
                        </div>
                        <CustomScreenTypeSelect 
                            value={formData.screenType}
                            options={screenTypesList}
                            onAdd={addScreenType}
                            onRemove={removeScreenType}
                            onChange={type => {
                                const defaultMultipliers = { '2D': 1.0, '3D': 1.3, 'IMAX': 1.5, '4DX': 2.0, 'ScreenX': 1.8 };
                                const update = { screenType: type };
                                if (defaultMultipliers[type] !== undefined) {
                                    update.priceMultiplier = defaultMultipliers[type];
                                }
                                setFormData({ ...formData, ...update });
                            }}
                        />
                        <div className="form-group-inline">
                            <label className="form-label-inline">Hệ số giá (×)</label>
                            <input className="form-input" type="number" step="0.01" min="0.5" max="5.0"
                                placeholder="1.00" required
                                value={formData.priceMultiplier}
                                onChange={e => setFormData({ ...formData, priceMultiplier: parseFloat(e.target.value) || 1.0 })}
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
                        <div key={room.id}
                            className={`room-item ${selectedRoom?.id === room.id ? 'active' : ''} ${room.status === 'INACTIVE' ? 'inactive' : ''}`}
                            onClick={() => handleSelectRoom(room)}>
                            <div>
                                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {room.name}
                                    <span className="room-status-dot">
                                        <FaCircle style={{ color: room.status === 'ACTIVE' ? '#22c55e' : '#ef4444' }} />
                                    </span>
                                </div>
                                <div className="room-meta">
                                    {room.totalRows}x{room.totalColumns}
                                    {room.screenType && <span className="screen-type-tag">{room.screenType}</span>}
                                    {room.priceMultiplier && <span className="multiplier-tag">×{Number(room.priceMultiplier).toFixed(2)}</span>}
                                </div>
                            </div>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <h2 className="room-name">{selectedRoom.name}</h2>
                                <span className={`status-pill ${selectedRoom.status === 'ACTIVE' ? 'pill-active' : 'pill-inactive'}`}>
                                    {selectedRoom.status === 'ACTIVE' ? <><FaCircle style={{ color: '#22c55e' }} /> Hoạt động</> : <><FaCircle style={{ color: '#ef4444' }} /> Ngưng hoạt động</>}
                                </span>
                                {selectedRoom.screenType && (
                                    <span className="screen-type-pill">{selectedRoom.screenType}</span>
                                )}
                                {selectedRoom.priceMultiplier && (
                                    <span className="multiplier-pill">×{Number(selectedRoom.priceMultiplier).toFixed(2)}</span>
                                )}
                                <span className={`sync-badge ${pendingChanges.size > 0 ? 'unsaved' : 'saved'}`}>
                                    {pendingChanges.size > 0 ? <><FaExclamationTriangle /> {pendingChanges.size} chưa lưu</> : <><FaCheckCircle /> Đã đồng bộ</>}
                                </span>
                            </div>

                            <div className="action-buttons">
                                {/* Seat save/cancel buttons */}
                                {pendingChanges.size > 0 && (
                                    <>
                                        <button onClick={handleCancel} className="btn-cancel">Hủy bỏ</button>
                                        <button onClick={handleSave} disabled={isSaving} className="btn-save">
                                            {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                                        </button>
                                    </>
                                )}

                                {/* Room actions */}
                                <button onClick={openEditModal} className="btn-action btn-edit" title="Sửa thông tin phòng">
                                    <FaPencilAlt /> Sửa
                                </button>
                                <button onClick={handleToggleStatus}
                                    className={`btn-action ${selectedRoom.status === 'ACTIVE' ? 'btn-deactivate' : 'btn-activate'}`}
                                    title={selectedRoom.status === 'ACTIVE' ? 'Ngưng hoạt động' : 'Kích hoạt lại'}>
                                    {selectedRoom.status === 'ACTIVE' ? (<><VscLock /> Ngưng hoạt động</>) : (<><FaUnlockKeyhole /> Hoạt động</>)}
                                </button>
                                <button onClick={handleDeleteClick} className="btn-action btn-delete" title="Xóa vĩnh viễn">
                                    <RiDeleteBin6Line /> Xóa
                                </button>
                            </div>
                        </div>

                        {/* Editor Canvas - Chỉ chứa SeatGrid */}
                        <div className="editor-canvas">
                            <SeatGrid
                                seats={seats}
                                totalColumns={selectedRoom.totalColumns}
                                onSeatClick={handleSeatClick}
                                priceMultiplier={selectedRoom.priceMultiplier}
                            />
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <div className="empty-emoji"><RiMovie2Line /></div>
                        <h3 style={{ fontSize: '1.5rem', margin: 0, color: '#374151' }}>Chào mừng trở lại!</h3>
                        <p>Chọn một phòng từ danh sách bên trái để bắt đầu thiết kế.</p>
                    </div>
                )}
            </div>

            {/* EDIT MODAL */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3> Sửa thông tin phòng</h3>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="modal-body">
                                <label className="form-label">Tên phòng</label>
                                <input className="form-input" value={editFormData.name} required
                                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                />

                                <label className="form-label">Loại màn hình</label>
                                <CustomScreenTypeSelect 
                                    value={editFormData.screenType}
                                    options={screenTypesList}
                                    onAdd={addScreenType}
                                    onRemove={removeScreenType}
                                    onChange={type => {
                                        const defaultMultipliers = { '2D': 1.0, '3D': 1.3, 'IMAX': 1.5, '4DX': 2.0, 'ScreenX': 1.8 };
                                        const update = { screenType: type };
                                        if (defaultMultipliers[type] !== undefined) {
                                            update.priceMultiplier = defaultMultipliers[type];
                                        }
                                        setEditFormData({ ...editFormData, ...update });
                                    }}
                                />

                                <label className="form-label">Số hàng ghế</label>
                                <input className="form-input form-input-disabled" type="number"
                                    value={selectedRoom.totalRows} disabled />

                                <label className="form-label">Số cột ghế</label>
                                <input className="form-input form-input-disabled" type="number"
                                    value={selectedRoom.totalColumns} disabled />
                                <p className="form-hint">
                                    Số hàng và cột ghế không thể thay đổi để bảo vệ dữ liệu vé đã bán.
                                    Nếu cần thay đổi sơ đồ ghế, hãy ngưng hoạt động phòng cũ và tạo phòng mới.
                                </p>

                                <label className="form-label">Hệ số giá (×)</label>
                                <input className="form-input" type="number" step="0.01" min="0.5" max="5.0"
                                    value={editFormData.priceMultiplier}
                                    onChange={e => setEditFormData({ ...editFormData, priceMultiplier: parseFloat(e.target.value) || 1.0 })}
                                />
                                <p className="form-hint-sm">
                                    Hệ số giá sẽ áp dụng cho các suất chiếu được tạo SAU khi thay đổi. Các suất chiếu cũ không bị ảnh hưởng.
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>Hủy bỏ</button>
                                <button type="submit" className="btn-save"><FaSave /> Lưu thay đổi</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRM MODAL */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}>
                    <div className="modal-content modal-danger" onClick={e => e.stopPropagation()}>
                        <div className="modal-header modal-header-danger">
                            <h3><RiDeleteBin6Line /> Xóa phòng vĩnh viễn</h3>
                            <button className="modal-close" onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}>✕</button>
                        </div>
                        <div className="modal-body">
                            {!deleteError ? (
                                <>
                                    <p className="delete-warning">
                                        <FaExclamationTriangle /> Bạn có chắc chắn muốn xóa phòng <strong>"{selectedRoom.name}"</strong>?
                                    </p>
                                    <p className="delete-warning-sub">Hành động này không thể hoàn tác. Phòng và tất cả ghế sẽ bị xóa vĩnh viễn.</p>
                                </>
                            ) : (
                                <div className="delete-error-container">
                                    <p className="delete-error-msg"><FaExclamationTriangle /> {deleteError}</p>
                                    <p className="delete-error-suggestion">
                                        Hệ thống đề xuất chuyển sang trạng thái <strong>Ngưng Hoạt Động</strong> thay vì xóa.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}>
                                Đóng
                            </button>
                            {!deleteError ? (
                                <button className="btn-danger" onClick={handleConfirmDelete}>
                                    <RiDeleteBin6Line /> Xóa vĩnh viễn
                                </button>
                            ) : (
                                <button className="btn-deactivate-suggest" onClick={handleDeactivateFromDeleteDialog}>
                                    <VscLock /> Ngưng hoạt động ngay
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomManager;