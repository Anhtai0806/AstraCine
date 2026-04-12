import React, { useState, useEffect, useRef } from 'react';
import { bannerAPI } from '../../api/adminApi';
import { FaTrash, FaPlus, FaEdit, FaToggleOn, FaToggleOff, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import './AdminBanner.css';

const emptyForm = { title: '', linkUrl: '', displayOrder: 0, isActive: true };

const AdminBanner = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state — 'add' | 'edit' | null
    const [modalMode, setModalMode] = useState(null);
    const [editTarget, setEditTarget] = useState(null); // banner đang sửa
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const fileRef = useRef(null);

    useEffect(() => { fetchBanners(); }, []);

    const fetchBanners = async () => {
        try {
            setLoading(true);
            const res = await bannerAPI.getAll();
            setBanners(res.data);
            setError(null);
        } catch (err) {
            setError('Không thể tải danh sách banner. Vui lòng thử lại.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ─── Mở modal Thêm ───────────────────────────────────────────────────────
    const openAdd = () => {
        setForm({ ...emptyForm, displayOrder: banners.length });
        setPreview(null);
        if (fileRef.current) fileRef.current.value = '';
        setError(null);
        setEditTarget(null);
        setModalMode('add');
    };

    // ─── Mở modal Sửa ────────────────────────────────────────────────────────
    const openEdit = (banner) => {
        setForm({
            title: banner.title || '',
            linkUrl: banner.linkUrl || '',
            displayOrder: banner.displayOrder ?? 0,
            isActive: banner.isActive ?? true,
        });
        setPreview(banner.imageUrl); // hiện ảnh hiện tại
        setError(null);
        setEditTarget(banner);
        setModalMode('edit');
    };

    const closeModal = () => {
        setModalMode(null);
        setEditTarget(null);
        setPreview(null);
        setError(null);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPreview(URL.createObjectURL(file));
    };

    // ─── Lưu: Thêm mới ───────────────────────────────────────────────────────
    const handleCreate = async (e) => {
        e.preventDefault();
        const file = fileRef.current?.files[0];
        if (!file) { setError('Vui lòng chọn ảnh banner.'); return; }

        const formData = new FormData();
        formData.append('image', file);
        formData.append('title', form.title);
        formData.append('linkUrl', form.linkUrl || '');
        formData.append('displayOrder', form.displayOrder);

        try {
            setSaving(true);
            await bannerAPI.create(formData);
            closeModal();
            fetchBanners();
        } catch (err) {
            setError(err?.response?.data?.message || 'Upload thất bại, vui lòng thử lại.');
        } finally {
            setSaving(false);
        }
    };

    // ─── Lưu: Chỉnh sửa ──────────────────────────────────────────────────────
    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await bannerAPI.update(editTarget.id, {
                title: form.title,
                linkUrl: form.linkUrl || '',
                displayOrder: form.displayOrder,
                isActive: form.isActive,
            });
            closeModal();
            fetchBanners();
        } catch (err) {
            setError(err?.response?.data?.message || 'Cập nhật thất bại, vui lòng thử lại.');
        } finally {
            setSaving(false);
        }
    };

    // ─── Các action inline ────────────────────────────────────────────────────
    const handleToggleActive = async (banner) => {
        try {
            await bannerAPI.update(banner.id, { isActive: !banner.isActive });
            fetchBanners();
        } catch {
            setError('Cập nhật trạng thái thất bại.');
        }
    };

    const handleMoveOrder = async (banner, direction) => {
        try {
            await bannerAPI.update(banner.id, { displayOrder: banner.displayOrder + direction });
            fetchBanners();
        } catch {
            setError('Cập nhật thứ tự thất bại.');
        }
    };

    const handleDelete = async (banner) => {
        if (!window.confirm(`Xóa banner "${banner.title || 'này'}"?`)) return;
        try {
            await bannerAPI.delete(banner.id);
            fetchBanners();
        } catch {
            setError('Xóa banner thất bại.');
        }
    };

    if (loading) {
        return (
            <div className="admin-banner-page">
                <div className="loading-spinner"><div className="spinner-border"></div></div>
            </div>
        );
    }

    const isEditMode = modalMode === 'edit';

    return (
        <div className="admin-banner-page">
            <div className="admin-banner-container">

                {/* Header */}
                <div className="admin-banner-header">
                    <h2>Quản Lý Banner</h2>
                    <button className="btn-custom btn-primary btn-add-banner" onClick={openAdd}>
                        <FaPlus /> Thêm banner
                    </button>
                </div>

                {/* Error */}
                {error && !modalMode && (
                    <div className="alert-custom alert-danger">
                        <span>{error}</span>
                        <button className="alert-close" onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                <p className="banner-tip">
                    💡 Thứ tự nhỏ hơn hiển thị trước. Sử dụng nút ↑ ↓ để sắp xếp.
                </p>

                {/* Banner Grid */}
                {banners.length === 0 ? (
                    <div className="banner-empty">
                        <span>🖼️</span>
                        <p>Chưa có banner nào. Hãy thêm banner đầu tiên!</p>
                    </div>
                ) : (
                    <div className="banner-grid">
                        {banners.map((b, idx) => (
                            <div key={b.id} className={`banner-card ${!b.isActive ? 'banner-inactive' : ''}`}>
                                <div className="banner-img-wrap">
                                    <img src={b.imageUrl} alt={b.title || `Banner ${b.id}`} />
                                    <span className={`banner-status-pill ${b.isActive ? 'pill-active' : 'pill-inactive'}`}>
                                        {b.isActive ? 'Hiển thị' : 'Ẩn'}
                                    </span>
                                    <span className="banner-order-pill">#{b.displayOrder}</span>
                                </div>
                                <div className="banner-card-body">
                                    <div className="banner-title-wrap">
                                        <p className="banner-title">{b.title || <em>Không có tiêu đề</em>}</p>
                                        {b.linkUrl && (
                                            <a
                                                href={b.linkUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="banner-link-chip"
                                                title={b.linkUrl}
                                            >
                                                🔗 {b.linkUrl.length > 30 ? b.linkUrl.slice(0, 30) + '…' : b.linkUrl}
                                            </a>
                                        )}
                                    </div>
                                    <div className="banner-actions">
                                        <button
                                            className="btn-custom btn-secondary btn-sm"
                                            onClick={() => handleMoveOrder(b, -1)}
                                            disabled={idx === 0}
                                            title="Lên trên"
                                        >
                                            <FaArrowUp />
                                        </button>
                                        <button
                                            className="btn-custom btn-secondary btn-sm"
                                            onClick={() => handleMoveOrder(b, 1)}
                                            disabled={idx === banners.length - 1}
                                            title="Xuống dưới"
                                        >
                                            <FaArrowDown />
                                        </button>
                                        {/* ← NÚT SỬA MỚI */}
                                        <button
                                            className="btn-custom btn-warning btn-sm"
                                            onClick={() => openEdit(b)}
                                            title="Chỉnh sửa"
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            className={`btn-custom btn-sm ${b.isActive ? 'btn-toggle-on' : 'btn-toggle-off'}`}
                                            onClick={() => handleToggleActive(b)}
                                            title={b.isActive ? 'Ẩn banner' : 'Hiện banner'}
                                        >
                                            {b.isActive ? <FaToggleOn /> : <FaToggleOff />}
                                        </button>
                                        <button
                                            className="btn-custom btn-danger btn-sm"
                                            onClick={() => handleDelete(b)}
                                            title="Xóa"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Modal Thêm / Sửa ─────────────────────────────────────────────── */}
            {modalMode && (
                <div className="custom-modal-backdrop" onClick={closeModal}>
                    <div className="custom-modal-panel banner-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="custom-modal-header">
                            <h3>{isEditMode ? '✏️ Chỉnh sửa banner' : '🖼️ Thêm banner mới'}</h3>
                            <button className="modal-close-btn" onClick={closeModal}>✕</button>
                        </div>

                        <form onSubmit={isEditMode ? handleUpdate : handleCreate}>
                            <div className="custom-modal-body">
                                {error && (
                                    <div className="alert-custom alert-danger" style={{ marginBottom: '1rem' }}>
                                        <span>{error}</span>
                                        <button type="button" className="alert-close" onClick={() => setError(null)}>✕</button>
                                    </div>
                                )}

                                {/* Upload ảnh — bắt buộc khi thêm, tuỳ chọn khi sửa */}
                                <div className="form-group-custom">
                                    <label>{isEditMode ? 'Ảnh banner (để trống = giữ nguyên)' : 'Ảnh banner *'}</label>
                                    <div className="upload-drop-zone" onClick={() => fileRef.current?.click()}>
                                        {preview ? (
                                            <img src={preview} alt="Preview" className="upload-preview" />
                                        ) : (
                                            <div className="upload-placeholder">
                                                <span>📁</span>
                                                <p>Click để chọn ảnh</p>
                                                <small>PNG, JPG, WEBP — Khuyến nghị 1920×600px</small>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                    />
                                </div>

                                <div className="form-group-custom">
                                    <label>Tiêu đề (tuỳ chọn)</label>
                                    <input
                                        className="form-control-custom"
                                        value={form.title}
                                        onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                                        placeholder="VD: Banner tháng 4"
                                    />
                                </div>

                                <div className="form-group-custom">
                                    <label>Link khi click vào banner (tuỳ chọn)</label>
                                    <input
                                        className="form-control-custom"
                                        type="url"
                                        value={form.linkUrl}
                                        onChange={(e) => setForm(f => ({ ...f, linkUrl: e.target.value }))}
                                        placeholder="VD: https://astracine.com/phim/doraemon"
                                    />
                                </div>

                                <div className="combo-form-row">
                                    <div className="form-group-custom">
                                        <label>Thứ tự hiển thị</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="form-control-custom"
                                            value={form.displayOrder}
                                            onChange={(e) => setForm(f => ({ ...f, displayOrder: Number(e.target.value) }))}
                                        />
                                    </div>
                                    {isEditMode && (
                                        <div className="form-group-custom">
                                            <label>Trạng thái</label>
                                            <select
                                                className="form-control-custom"
                                                value={form.isActive ? 'true' : 'false'}
                                                onChange={(e) => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}
                                            >
                                                <option value="true">Hiển thị</option>
                                                <option value="false">Ẩn</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="custom-modal-footer">
                                <button type="button" className="btn-custom btn-secondary" onClick={closeModal}>
                                    Huỷ
                                </button>
                                <button type="submit" className="btn-custom btn-primary" disabled={saving}>
                                    {saving
                                        ? (isEditMode ? 'Đang lưu...' : 'Đang upload...')
                                        : (isEditMode ? 'Cập nhật' : 'Thêm banner')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminBanner;
