import React, { useState, useEffect } from 'react';
import { promotionAPI } from '../../api/adminApi';
import { FaEdit, FaTrash, FaPlus, FaTicketAlt } from 'react-icons/fa';
import './AdminPromotions.css';

const AdminPromotions = () => {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [currentPromotion, setCurrentPromotion] = useState({
        code: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: '',
        startDate: '',
        endDate: '',
        status: 'ACTIVE',
        maxUsage: '',
        minOrderAmount: '0'
    });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchPromotions();
    }, []);

    const fetchPromotions = async () => {
        try {
            setLoading(true);
            const response = await promotionAPI.getAll();
            setPromotions(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch promotions. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleShowModal = (promotion = null) => {
        if (promotion) {
            setCurrentPromotion({
                ...promotion,
                maxUsage: promotion.maxUsage || '',
                minOrderAmount: promotion.minOrderAmount || '0'
            });
            setIsEditing(true);
        } else {
            setCurrentPromotion({
                code: '',
                description: '',
                discountType: 'PERCENTAGE',
                discountValue: '',
                startDate: '',
                endDate: '',
                status: 'ACTIVE',
                maxUsage: '',
                minOrderAmount: '0'
            });
            setIsEditing(false);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentPromotion({
            code: '',
            description: '',
            discountType: 'PERCENTAGE',
            discountValue: '',
            startDate: '',
            endDate: '',
            status: 'ACTIVE',
            maxUsage: '',
            minOrderAmount: '0'
        });
        setError(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // Client-side validation
        if (currentPromotion.discountType === 'PERCENTAGE' &&
            (parseFloat(currentPromotion.discountValue) <= 0 || parseFloat(currentPromotion.discountValue) > 100)) {
            setError('Percentage discount must be between 0 and 100');
            return;
        }

        if (new Date(currentPromotion.endDate) < new Date(currentPromotion.startDate)) {
            setError('End date must be after or equal to start date');
            return;
        }

        try {
            const promotionData = {
                ...currentPromotion,
                maxUsage: currentPromotion.maxUsage === '' ? null : parseInt(currentPromotion.maxUsage),
                minOrderAmount: parseFloat(currentPromotion.minOrderAmount) || 0
            };

            if (isEditing) {
                await promotionAPI.update(currentPromotion.id, promotionData);
            } else {
                await promotionAPI.create(promotionData);
            }
            fetchPromotions();
            handleCloseModal();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save promotion. Please try again.');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this promotion?')) {
            try {
                await promotionAPI.delete(id);
                fetchPromotions();
            } catch (err) {
                setError('Failed to delete promotion. It might be in use.');
                console.error(err);
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const getStatusBadge = (status) => {
        return status === 'ACTIVE' ?
            <span className="badge-custom badge-success">Active</span> :
            <span className="badge-custom badge-secondary">Inactive</span>;
    };

    const getDiscountDisplay = (promotion) => {
        if (promotion.discountType === 'PERCENTAGE') {
            return `${promotion.discountValue}%`;
        } else {
            return `${parseFloat(promotion.discountValue).toLocaleString('vi-VN')}đ`;
        }
    };

    const getUsageDisplay = (promotion) => {
        if (promotion.maxUsage === null) {
            return `${promotion.currentUsage || 0} / Unlimited`;
        }
        return `${promotion.currentUsage || 0} / ${promotion.maxUsage}`;
    };

    if (loading) return (
        <div className="admin-promotions-page">
            <div className="loading-spinner">
                <div className="spinner-border"></div>
            </div>
        </div>
    );

    return (
        <div className="admin-promotions-page">
            <div className="admin-promotions-container">
                <div className="admin-promotions-header">
                    <h2><FaTicketAlt className="me-2" />Quản lý Mã Khuyến Mãi</h2>
                    <button className="btn-custom btn-primary btn-add-promotion" onClick={() => handleShowModal()}>
                        <FaPlus className="me-2" /> Thêm Mã Khuyến Mãi
                    </button>
                </div>

                {error && (
                    <div className="alert-custom alert-danger">
                        <span>{error}</span>
                        <button className="alert-close" onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                <div className="table-responsive">
                    <table className="promotions-table custom-table">
                        <thead>
                            <tr>
                                <th>Mã</th>
                                <th>Mô tả</th>
                                <th>Loại</th>
                                <th>Giá trị</th>
                                <th>Sử dụng</th>
                                <th>Ngày bắt đầu</th>
                                <th>Ngày kết thúc</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {promotions.length > 0 ? (
                                promotions.map((promotion) => (
                                    <tr key={promotion.id}>
                                        <td className="promotion-code"><strong>{promotion.code}</strong></td>
                                        <td className="promotion-description">{promotion.description || 'N/A'}</td>
                                        <td>{promotion.discountType === 'PERCENTAGE' ? 'Phần trăm' : 'Cố định'}</td>
                                        <td className="promotion-value">{getDiscountDisplay(promotion)}</td>
                                        <td>{getUsageDisplay(promotion)}</td>
                                        <td>{formatDate(promotion.startDate)}</td>
                                        <td>{formatDate(promotion.endDate)}</td>
                                        <td>{getStatusBadge(promotion.status)}</td>
                                        <td>
                                            <div className="promotion-actions">
                                                <button className="btn-custom btn-warning btn-sm btn-edit-promotion" onClick={() => handleShowModal(promotion)}>
                                                    <FaEdit />
                                                </button>
                                                <button className="btn-custom btn-danger btn-sm btn-delete-promotion" onClick={() => handleDelete(promotion.id)}>
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" className="no-data-message">Chưa có mã khuyến mãi nào.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {showModal && (
                    <div className="custom-modal-backdrop" onClick={handleCloseModal}>
                        <div className="custom-modal-panel promotion-modal" onClick={e => e.stopPropagation()}>
                            <div className="custom-modal-header">
                                <h3>{isEditing ? 'Chỉnh sửa Mã Khuyến Mãi' : 'Thêm Mã Khuyến Mãi Mới'}</h3>
                                <button className="modal-close-btn" onClick={handleCloseModal}>✕</button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="custom-modal-body">
                                    <div className="form-group-custom mb-3">
                                        <label>Mã khuyến mãi *</label>
                                        <input
                                            type="text"
                                            className="form-control-custom"
                                            placeholder="VD: SUMMER2026"
                                            value={currentPromotion.code}
                                            onChange={(e) => setCurrentPromotion({ ...currentPromotion, code: e.target.value.toUpperCase() })}
                                            required
                                        />
                                        <small className="text-muted mt-1 d-block">
                                            Chỉ sử dụng chữ in hoa, số, gạch dưới và gạch ngang
                                        </small>
                                    </div>

                                    <div className="form-group-custom mb-3">
                                        <label>Mô tả</label>
                                        <textarea
                                            rows="2"
                                            className="form-control-custom"
                                            placeholder="Mô tả về chương trình khuyến mãi"
                                            value={currentPromotion.description}
                                            onChange={(e) => setCurrentPromotion({ ...currentPromotion, description: e.target.value })}
                                        ></textarea>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-col">
                                            <div className="form-group-custom mb-3">
                                                <label>Loại giảm giá *</label>
                                                <select
                                                    className="form-control-custom"
                                                    value={currentPromotion.discountType}
                                                    onChange={(e) => setCurrentPromotion({ ...currentPromotion, discountType: e.target.value })}
                                                    required
                                                >
                                                    <option value="PERCENTAGE">Phần trăm (%)</option>
                                                    <option value="FIXED">Số tiền cố định (đ)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="form-col">
                                            <div className="form-group-custom mb-3">
                                                <label>Giá trị giảm *</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="form-control-custom"
                                                    placeholder={currentPromotion.discountType === 'PERCENTAGE' ? '0-100' : 'Số tiền'}
                                                    value={currentPromotion.discountValue}
                                                    onChange={(e) => setCurrentPromotion({ ...currentPromotion, discountValue: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-col">
                                            <div className="form-group-custom mb-3">
                                                <label>Ngày bắt đầu *</label>
                                                <input
                                                    type="date"
                                                    className="form-control-custom"
                                                    value={currentPromotion.startDate}
                                                    onChange={(e) => setCurrentPromotion({ ...currentPromotion, startDate: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="form-col">
                                            <div className="form-group-custom mb-3">
                                                <label>Ngày kết thúc *</label>
                                                <input
                                                    type="date"
                                                    className="form-control-custom"
                                                    value={currentPromotion.endDate}
                                                    onChange={(e) => setCurrentPromotion({ ...currentPromotion, endDate: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-col">
                                            <div className="form-group-custom mb-3">
                                                <label>Giới hạn sử dụng</label>
                                                <input
                                                    type="number"
                                                    className="form-control-custom"
                                                    placeholder="Để trống = không giới hạn"
                                                    value={currentPromotion.maxUsage}
                                                    onChange={(e) => setCurrentPromotion({ ...currentPromotion, maxUsage: e.target.value })}
                                                />
                                                <small className="text-muted mt-1 d-block">
                                                    Số lần tối đa mã có thể được sử dụng
                                                </small>
                                            </div>
                                        </div>
                                        <div className="form-col">
                                            <div className="form-group-custom mb-3">
                                                <label>Đơn hàng tối thiểu (đ)</label>
                                                <input
                                                    type="number"
                                                    step="1000"
                                                    className="form-control-custom"
                                                    placeholder="0"
                                                    value={currentPromotion.minOrderAmount}
                                                    onChange={(e) => setCurrentPromotion({ ...currentPromotion, minOrderAmount: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group-custom mb-3">
                                        <label>Trạng thái *</label>
                                        <select
                                            className="form-control-custom"
                                            value={currentPromotion.status}
                                            onChange={(e) => setCurrentPromotion({ ...currentPromotion, status: e.target.value })}
                                            required
                                        >
                                            <option value="ACTIVE">Hoạt động</option>
                                            <option value="INACTIVE">Không hoạt động</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="custom-modal-footer">
                                    <button type="button" className="btn-custom btn-secondary" onClick={handleCloseModal}>
                                        Hủy
                                    </button>
                                    <button type="submit" className="btn-custom btn-primary">
                                        {isEditing ? 'Cập nhật' : 'Tạo mới'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPromotions;
