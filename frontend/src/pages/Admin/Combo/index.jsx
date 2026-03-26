import React, { useState, useEffect } from 'react';
import { comboAPI } from '../../../api/adminApi';
import { FaEdit, FaTrash, FaPlus, FaSearch, FaTimes } from 'react-icons/fa';
import './AdminCombo.css';

const emptyCombo = {
    name: '',
    price: '',
    stockQuantity: 0,
    status: 'ACTIVE',
};

const formatVND = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

const StockBadge = ({ qty }) => {
    if (qty === null || qty === undefined) return <span className="stock-badge stock-out">—</span>;
    if (qty === 0) return <span className="stock-badge stock-out">🔴 Hết hàng</span>;
    if (qty < 10) return <span className="stock-badge stock-low">🟡 Còn {qty}</span>;
    return <span className="stock-badge stock-ok">🟢 {qty}</span>;
};

const StatusBadge = ({ status }) =>
    status === 'ACTIVE'
        ? <span className="status-badge status-active">Đang bán</span>
        : <span className="status-badge status-inactive">Ngừng bán</span>;

export default function AdminCombo() {
    const [combos, setCombos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Filter state
    const [keyword, setKeyword] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [current, setCurrent] = useState(emptyCombo);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchCombos(); }, []);

    const fetchCombos = async () => {
        try {
            setLoading(true);
            const res = await comboAPI.getAll();
            setCombos(res.data);
        } catch {
            setError('Không thể tải danh sách bắp nước.');
        } finally {
            setLoading(false);
        }
    };

    // Client-side filter
    const filtered = combos.filter((c) => {
        const matchName = !keyword.trim() || c.name.toLowerCase().includes(keyword.toLowerCase());
        const matchStatus = !filterStatus || c.status === filterStatus;
        return matchName && matchStatus;
    });

    const openAdd = () => {
        setCurrent(emptyCombo);
        setIsEditing(false);
        setError(null);
        setShowModal(true);
    };

    const openEdit = (combo) => {
        setCurrent({
            id: combo.id,
            name: combo.name,
            price: combo.price,
            stockQuantity: combo.stockQuantity ?? 0,
            status: combo.status,
        });
        setIsEditing(true);
        setError(null);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setCurrent(emptyCombo);
        setError(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrent((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!current.name.trim()) { setError('Tên combo không được để trống.'); return; }
        if (!current.price || Number(current.price) < 0) { setError('Giá phải lớn hơn hoặc bằng 0.'); return; }
        if (Number(current.stockQuantity) < 0) { setError('Số lượng tồn kho không được âm.'); return; }

        const payload = {
            name: current.name.trim(),
            price: Number(current.price),
            stockQuantity: Number(current.stockQuantity),
            status: current.status,
        };

        try {
            setSaving(true);
            if (isEditing) {
                await comboAPI.update(current.id, payload);
            } else {
                await comboAPI.create(payload);
            }
            closeModal();
            fetchCombos();
        } catch (err) {
            setError(err?.response?.data?.message || 'Lưu thất bại, vui lòng thử lại.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (combo) => {
        if (!window.confirm(`Ngừng kinh doanh combo "${combo.name}"?`)) return;
        try {
            await comboAPI.delete(combo.id);
            fetchCombos();
        } catch {
            setError('Xóa thất bại.');
        }
    };

    return (
        <div className="admin-combo-page">
            <div className="admin-combo-container">
                {/* Header */}
                <div className="admin-combo-header">
                    <h2>🍿 Quản Lý Bắp &amp; Nước</h2>
                    <button className="btn-combo btn-combo-primary" onClick={openAdd}>
                        <FaPlus /> Thêm combo
                    </button>
                </div>

                {/* Filters */}
                <div className="combo-filter-bar">
                    <input
                        placeholder="🔍 Tìm theo tên combo..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả trạng thái</option>
                        <option value="ACTIVE">Đang bán</option>
                        <option value="INACTIVE">Ngừng bán</option>
                    </select>
                    <button
                        className="btn-combo btn-combo-secondary"
                        onClick={() => { setKeyword(''); setFilterStatus(''); }}
                        type="button"
                    >
                        <FaTimes /> Xóa bộ lọc
                    </button>
                </div>

                {/* Error alert */}
                {error && !showModal && (
                    <div className="combo-alert">
                        <span>{error}</span>
                        <button onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                {/* Table */}
                {loading ? (
                    <div className="combo-spinner"><div className="spinner-ring" /></div>
                ) : (
                    <div className="combo-table-wrapper">
                        <table className="combo-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Tên combo</th>
                                    <th>Giá bán</th>
                                    <th>Tồn kho</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="combo-no-data">
                                            Không có combo nào phù hợp
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((c) => (
                                        <tr key={c.id}>
                                            <td>{c.id}</td>
                                            <td><span className="combo-name-bold">{c.name}</span></td>
                                            <td>{formatVND(c.price)}</td>
                                            <td><StockBadge qty={c.stockQuantity} /></td>
                                            <td><StatusBadge status={c.status} /></td>
                                            <td>
                                                <div className="combo-actions">
                                                    <button
                                                        className="btn-combo btn-combo-warning btn-combo-sm"
                                                        onClick={() => openEdit(c)}
                                                    >
                                                        <FaEdit /> Sửa
                                                    </button>
                                                    <button
                                                        className="btn-combo btn-combo-danger btn-combo-sm"
                                                        onClick={() => handleDelete(c)}
                                                        disabled={c.status === 'INACTIVE'}
                                                    >
                                                        <FaTrash /> Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            {showModal && (
                <div className="combo-modal-backdrop" onClick={closeModal}>
                    <div className="combo-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="combo-modal-header">
                            <h3>{isEditing ? '✏️ Chỉnh sửa combo' : '➕ Thêm combo mới'}</h3>
                            <button className="combo-modal-close" onClick={closeModal}>✕</button>
                        </div>

                        <form onSubmit={handleSave}>
                            <div className="combo-modal-body">
                                {error && (
                                    <div className="combo-alert">
                                        <span>{error}</span>
                                        <button type="button" onClick={() => setError(null)}>✕</button>
                                    </div>
                                )}

                                {/* Tên */}
                                <div className="combo-form-group">
                                    <label>Tên combo *</label>
                                    <input
                                        name="name"
                                        value={current.name}
                                        onChange={handleChange}
                                        placeholder="VD: Combo Solo (1 Bắp + 1 Nước)"
                                        required
                                    />
                                </div>

                                <div className="combo-form-row">
                                    {/* Giá */}
                                    <div className="combo-form-group">
                                        <label>Giá bán (VNĐ) *</label>
                                        <input
                                            name="price"
                                            type="number"
                                            min="0"
                                            step="1000"
                                            value={current.price}
                                            onChange={handleChange}
                                            placeholder="75000"
                                            required
                                        />
                                    </div>

                                    {/* Tồn kho */}
                                    <div className="combo-form-group">
                                        <label>Số lượng tồn kho</label>
                                        <input
                                            name="stockQuantity"
                                            type="number"
                                            min="0"
                                            value={current.stockQuantity}
                                            onChange={handleChange}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                {/* Trạng thái */}
                                <div className="combo-form-group">
                                    <label>Trạng thái</label>
                                    <select name="status" value={current.status} onChange={handleChange}>
                                        <option value="ACTIVE">Đang bán</option>
                                        <option value="INACTIVE">Ngừng bán</option>
                                    </select>
                                </div>
                            </div>

                            <div className="combo-modal-footer">
                                <button type="button" className="btn-combo btn-combo-secondary" onClick={closeModal}>
                                    Hủy
                                </button>
                                <button type="submit" className="btn-combo btn-combo-primary" disabled={saving}>
                                    {saving ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}