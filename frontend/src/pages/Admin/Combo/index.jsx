import React, { useState, useEffect } from 'react';
import { comboAPI } from '../../../api/adminApi';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import './AdminCombo.css';

const emptyCombo = { name: '', price: '', stockQuantity: 0, status: 'ACTIVE' };

const formatVND = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

const StockBadge = ({ qty }) => {
    if (qty === null || qty === undefined) return <span className="stock-badge stock-out">—</span>;
    if (qty === 0) return <span className="stock-badge stock-out">Hết hàng</span>;
    if (qty < 10) return <span className="stock-badge stock-low">Còn {qty}</span>;
    return <span className="stock-badge stock-ok">{qty}</span>;
};

const StatusBadge = ({ status }) =>
    status === 'ACTIVE'
        ? <span className="status-badge status-active">Đang bán</span>
        : <span className="status-badge status-inactive">Ngừng bán</span>;

const AdminCombo = () => {
    const [combos, setCombos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
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
            setError(null);
        } catch (err) {
            setError('Không thể tải danh sách bắp nước. Vui lòng thử lại.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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
        setCurrent({ id: combo.id, name: combo.name, price: combo.price, stockQuantity: combo.stockQuantity ?? 0, status: combo.status });
        setIsEditing(true);
        setError(null);
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setCurrent(emptyCombo); setError(null); };

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
            setError('Không thể thực hiện thao tác. Vui lòng thử lại.');
        }
    };

    if (loading) {
        return (
            <div className="admin-combo-page">
                <div className="loading-spinner">
                    <div className="spinner-border"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-combo-page">
            <div className="admin-combo-container">

                {/* Header */}
                <div className="admin-combo-header">
                    <h2>Quản Lý Bắp &amp; Nước</h2>
                    <button className="btn-custom btn-primary btn-add-combo" onClick={openAdd}>
                        <FaPlus className="me-2" /> Thêm combo
                    </button>
                </div>

                {/* Filter bar */}
                <div className="combo-filter-bar">
                    <input
                        className="form-control-custom"
                        placeholder="Tìm theo tên combo..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                    <select
                        className="form-control-custom"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="ACTIVE">Đang bán</option>
                        <option value="INACTIVE">Ngừng bán</option>
                    </select>
                    {(keyword || filterStatus) && (
                        <button
                            className="btn-custom btn-secondary"
                            onClick={() => { setKeyword(''); setFilterStatus(''); }}
                        >
                            Xóa bộ lọc
                        </button>
                    )}
                </div>

                {/* Error */}
                {error && !showModal && (
                    <div className="alert-custom alert-danger">
                        <span>{error}</span>
                        <button className="alert-close" onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                {/* Table */}
                <div className="table-responsive">
                    <table className="combos-table custom-table">
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
                            {filtered.length > 0 ? (
                                filtered.map((c) => (
                                    <tr key={c.id}>
                                        <td className="combo-id">{c.id}</td>
                                        <td className="combo-name-cell">{c.name}</td>
                                        <td>{formatVND(c.price)}</td>
                                        <td><StockBadge qty={c.stockQuantity} /></td>
                                        <td><StatusBadge status={c.status} /></td>
                                        <td>
                                            <div className="combo-actions">
                                                <button
                                                    className="btn-custom btn-warning btn-sm btn-edit-combo"
                                                    onClick={() => openEdit(c)}
                                                    title="Chỉnh sửa"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    className="btn-custom btn-danger btn-sm btn-delete-combo"
                                                    onClick={() => handleDelete(c)}
                                                    disabled={c.status === 'INACTIVE'}
                                                    title={c.status === 'INACTIVE' ? 'Đã ngừng bán' : 'Ngừng kinh doanh'}
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="no-data-message">Không có combo nào phù hợp.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="custom-modal-backdrop" onClick={closeModal}>
                    <div className="custom-modal-panel combo-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="custom-modal-header">
                            <h3>{isEditing ? '✏️ Chỉnh sửa combo' : '➕ Thêm combo mới'}</h3>
                            <button className="modal-close-btn" onClick={closeModal}>✕</button>
                        </div>

                        <form onSubmit={handleSave}>
                            <div className="custom-modal-body">
                                {error && (
                                    <div className="alert-custom alert-danger" style={{ marginBottom: '1rem' }}>
                                        <span>{error}</span>
                                        <button type="button" className="alert-close" onClick={() => setError(null)}>✕</button>
                                    </div>
                                )}

                                <div className="form-group-custom">
                                    <label>Tên combo *</label>
                                    <input
                                        name="name"
                                        className="form-control-custom"
                                        value={current.name}
                                        onChange={handleChange}
                                        placeholder="VD: Combo Solo (1 Bắp + 1 Nước)"
                                        required
                                    />
                                </div>

                                <div className="combo-form-row">
                                    <div className="form-group-custom">
                                        <label>Giá bán (VNĐ) *</label>
                                        <input
                                            name="price"
                                            type="number"
                                            min="0"
                                            step="1000"
                                            className="form-control-custom"
                                            value={current.price}
                                            onChange={handleChange}
                                            placeholder="75000"
                                            required
                                        />
                                    </div>
                                    <div className="form-group-custom">
                                        <label>Số lượng tồn kho</label>
                                        <input
                                            name="stockQuantity"
                                            type="number"
                                            min="0"
                                            className="form-control-custom"
                                            value={current.stockQuantity}
                                            onChange={handleChange}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="form-group-custom">
                                    <label>Trạng thái</label>
                                    <select name="status" className="form-control-custom" value={current.status} onChange={handleChange}>
                                        <option value="ACTIVE">Đang bán</option>
                                        <option value="INACTIVE">Ngừng bán</option>
                                    </select>
                                </div>
                            </div>

                            <div className="custom-modal-footer">
                                <button type="button" className="btn-custom btn-secondary" onClick={closeModal}>
                                    Huỷ
                                </button>
                                <button type="submit" className="btn-custom btn-primary" disabled={saving}>
                                    {saving ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCombo;