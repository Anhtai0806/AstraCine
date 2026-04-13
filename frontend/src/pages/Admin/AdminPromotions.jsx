import React, { useState, useEffect, useRef } from 'react';
import { promotionAPI } from '../../api/adminApi';
import { FaEdit, FaTrash, FaPlus, FaTicketAlt } from 'react-icons/fa';
import './AdminPromotions.css';

const emptyPromotion = {
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    startDate: '',
    endDate: '',
    status: 'ACTIVE',
    maxUsage: '',
    maxUsagePerUser: '',
    minOrderAmount: '0',
    maxDiscountAmount: '',
    applicableTo: 'ALL'
};

const AdminPromotions = () => {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [currentPromotion, setCurrentPromotion] = useState(emptyPromotion);
    const [isEditing, setIsEditing] = useState(false);

    const codeRef = useRef(null);
    const discountValueRef = useRef(null);
    const startDateRef = useRef(null);
    const endDateRef = useRef(null);
    const maxUsageRef = useRef(null);
    const maxUsagePerUserRef = useRef(null);
    const minOrderAmountRef = useRef(null);
    const maxDiscountAmountRef = useRef(null);

    useEffect(() => {
        fetchPromotions();
    }, []);

    const getTodayDateString = () => {
        const now = new Date();
        const offsetMs = now.getTimezoneOffset() * 60000;
        return new Date(now.getTime() - offsetMs).toISOString().split('T')[0];
    };

    const clearFieldValidity = (ref) => {
        if (ref?.current) {
            ref.current.setCustomValidity('');
        }
    };

    const showFieldError = (ref, message) => {
        if (!ref?.current) return false;
        ref.current.setCustomValidity(message);
        ref.current.reportValidity();
        return true;
    };

    const fieldRefMap = {
        code: codeRef,
        discountValue: discountValueRef,
        startDate: startDateRef,
        endDate: endDateRef,
        maxUsage: maxUsageRef,
        maxUsagePerUser: maxUsagePerUserRef,
        minOrderAmount: minOrderAmountRef,
        maxDiscountAmount: maxDiscountAmountRef,
    };

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
                maxUsagePerUser: promotion.maxUsagePerUser || '',
                minOrderAmount: promotion.minOrderAmount || '0',
                maxDiscountAmount: promotion.maxDiscountAmount || '',
                applicableTo: promotion.applicableTo || 'ALL'
            });
            setIsEditing(true);
        } else {
            setCurrentPromotion({ ...emptyPromotion });
            setIsEditing(false);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentPromotion({ ...emptyPromotion });
        setError(null);
        [
            codeRef,
            discountValueRef,
            startDateRef,
            endDateRef,
            maxUsageRef,
            maxUsagePerUserRef,
            minOrderAmountRef,
            maxDiscountAmountRef,
        ].forEach(clearFieldValidity);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        [
            codeRef,
            discountValueRef,
            startDateRef,
            endDateRef,
            maxUsageRef,
            maxUsagePerUserRef,
            minOrderAmountRef,
            maxDiscountAmountRef,
        ].forEach(clearFieldValidity);

        const normalizedCode = (currentPromotion.code || '').trim().toUpperCase();

        if (!normalizedCode) {
            showFieldError(codeRef, 'Vui lòng nhập mã khuyến mãi.');
            return;
        }

        if (!/^[A-Z0-9_-]+$/.test(normalizedCode)) {
            showFieldError(codeRef, 'Mã chỉ được chứa chữ in hoa, số, gạch dưới và gạch ngang.');
            return;
        }

        if (!currentPromotion.discountValue || parseFloat(currentPromotion.discountValue) <= 0) {
            showFieldError(discountValueRef, 'Giá trị giảm phải lớn hơn 0.');
            return;
        }

        if (currentPromotion.discountType === 'PERCENTAGE' &&
            (parseFloat(currentPromotion.discountValue) <= 0 || parseFloat(currentPromotion.discountValue) > 100)) {
            showFieldError(discountValueRef, 'Giá trị phần trăm phải nằm trong khoảng từ 1 đến 100.');
            return;
        }

        if (!currentPromotion.startDate) {
            showFieldError(startDateRef, 'Vui lòng chọn ngày bắt đầu.');
            return;
        }

        if (!isEditing && currentPromotion.startDate < getTodayDateString()) {
            showFieldError(startDateRef, 'Ngày bắt đầu không được nhỏ hơn ngày hiện tại.');
            return;
        }

        if (!currentPromotion.endDate) {
            showFieldError(endDateRef, 'Vui lòng chọn ngày kết thúc.');
            return;
        }

        if (new Date(currentPromotion.endDate) < new Date(currentPromotion.startDate)) {
            showFieldError(endDateRef, 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.');
            return;
        }

        const parsedMaxUsage = currentPromotion.maxUsage === '' ? null : parseInt(currentPromotion.maxUsage, 10);
        if (parsedMaxUsage !== null && (Number.isNaN(parsedMaxUsage) || parsedMaxUsage < 1)) {
            showFieldError(maxUsageRef, 'Giới hạn sử dụng phải từ 1 trở lên nếu bạn có nhập giá trị này.');
            return;
        }

        const parsedMaxUsagePerUser = currentPromotion.maxUsagePerUser === '' ? null : parseInt(currentPromotion.maxUsagePerUser, 10);
        if (parsedMaxUsagePerUser !== null && (Number.isNaN(parsedMaxUsagePerUser) || parsedMaxUsagePerUser < 1)) {
            showFieldError(maxUsagePerUserRef, 'Giới hạn theo user phải từ 1 trở lên nếu bạn có nhập giá trị này.');
            return;
        }

        if ((parseFloat(currentPromotion.minOrderAmount) || 0) < 0) {
            showFieldError(minOrderAmountRef, 'Đơn hàng tối thiểu không được nhỏ hơn 0.');
            return;
        }

        const parsedMaxDiscountAmount = currentPromotion.maxDiscountAmount === '' ? null : parseFloat(currentPromotion.maxDiscountAmount);
        if (parsedMaxDiscountAmount !== null && (Number.isNaN(parsedMaxDiscountAmount) || parsedMaxDiscountAmount <= 0)) {
            showFieldError(maxDiscountAmountRef, 'Giảm tối đa phải lớn hơn 0 nếu bạn có nhập giá trị này.');
            return;
        }

        try {
            const promotionData = {
                ...currentPromotion,
                code: normalizedCode,
                maxUsage: parsedMaxUsage,
                maxUsagePerUser: parsedMaxUsagePerUser,
                minOrderAmount: parseFloat(currentPromotion.minOrderAmount) || 0,
                maxDiscountAmount: parsedMaxDiscountAmount,
                applicableTo: currentPromotion.applicableTo || 'ALL'
            };

            if (isEditing) {
                await promotionAPI.update(currentPromotion.id, promotionData);
            } else {
                await promotionAPI.create(promotionData);
            }
            fetchPromotions();
            handleCloseModal();
        } catch (err) {
            const backendErrors = err?.response?.data?.errors;
            if (backendErrors && typeof backendErrors === 'object') {
                const firstErrorEntry = Object.entries(backendErrors).find(([field]) => fieldRefMap[field]);
                if (firstErrorEntry) {
                    const [field, message] = firstErrorEntry;
                    showFieldError(fieldRefMap[field], message);
                    return;
                }
            }

            const backendMessage = err?.response?.data?.message || '';
            if (
                typeof backendMessage === 'string' &&
                (backendMessage.toLowerCase().includes('already exists') ||
                    backendMessage.toLowerCase().includes('already exist') ||
                    backendMessage.toLowerCase().includes('đã tồn tại') ||
                    backendMessage.toLowerCase().includes('da ton tai') ||
                    backendMessage.toLowerCase().includes('trùng mã') ||
                    backendMessage.toLowerCase().includes('trung ma'))
            ) {
                showFieldError(codeRef, 'Mã khuyến mãi đã tồn tại.');
                return;
            }

            setError(backendMessage || 'Failed to save promotion. Please try again.');
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

    const formatCurrency = (amount) => {
        const numericAmount = parseFloat(amount) || 0;
        return `${numericAmount.toLocaleString('vi-VN')}đ`;
    };

    const getStatusBadge = (status) => {
        return status === 'ACTIVE' ?
            <span className="badge-custom badge-success">Active</span> :
            <span className="badge-custom badge-secondary">Inactive</span>;
    };

    const getDiscountDisplay = (promotion) => {
        const discount = promotion.discountType === 'PERCENTAGE'
            ? `${promotion.discountValue}%`
            : `${parseFloat(promotion.discountValue).toLocaleString('vi-VN')}đ`;
        const maxDiscount = parseFloat(promotion.maxDiscountAmount);
        if (!Number.isNaN(maxDiscount) && maxDiscount > 0) {
            return `${discount} (tối đa ${formatCurrency(maxDiscount)})`;
        }
        return discount;
    };

    const getUsageDisplay = (promotion) => {
        if (promotion.maxUsage === null) {
            return `${promotion.currentUsage || 0} / Unlimited`;
        }
        return `${promotion.currentUsage || 0} / ${promotion.maxUsage}`;
    };

    const getApplicableToBadge = (applicableTo) => {
        switch (applicableTo) {
            case 'TICKET':
                return <span className="badge-custom badge-info" style={{ backgroundColor: '#0ea5e9' }}>Chỉ Vé</span>;
            case 'COMBO':
                return <span className="badge-custom badge-warning" style={{ backgroundColor: '#eab308' }}>Chỉ Bắp Nước</span>;
            case 'ALL':
            default:
                return <span className="badge-custom badge-primary" style={{ backgroundColor: '#8b5cf6' }}>Tất cả</span>;
        }
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
                                <th>Áp dụng cho</th>
                                <th>Đơn hàng tối thiểu</th>
                                <th>Giá trị giảm</th>
                                <th>Giới hạn / user</th>
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
                                        <td>{getApplicableToBadge(promotion.applicableTo)}</td>
                                        <td>{formatCurrency(promotion.minOrderAmount)}</td>
                                        <td className="promotion-value">{getDiscountDisplay(promotion)}</td>
                                        <td>{promotion.maxUsagePerUser ?? 'Unlimited'}</td>
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
                                    <td colSpan="11" className="no-data-message">Chưa có mã khuyến mãi nào.</td>
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
                                            ref={codeRef}
                                            value={currentPromotion.code}
                                            onChange={(e) => {
                                                clearFieldValidity(codeRef);
                                                setCurrentPromotion({ ...currentPromotion, code: e.target.value.toUpperCase() });
                                            }}
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
                                                    ref={discountValueRef}
                                                    value={currentPromotion.discountValue}
                                                    onChange={(e) => {
                                                        clearFieldValidity(discountValueRef);
                                                        setCurrentPromotion({ ...currentPromotion, discountValue: e.target.value });
                                                    }}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group-custom mb-3">
                                        <label>Áp dụng cho *</label>
                                        <select
                                            className="form-control-custom"
                                            value={currentPromotion.applicableTo}
                                            onChange={(e) => setCurrentPromotion({ ...currentPromotion, applicableTo: e.target.value })}
                                            required
                                        >
                                            <option value="ALL">Toàn bộ đơn hàng (Vé & Bắp nước)</option>
                                            <option value="TICKET">Chỉ áp dụng cho Vé</option>
                                            <option value="COMBO">Chỉ áp dụng cho Bắp nước (Combo)</option>
                                        </select>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-col">
                                            <div className="form-group-custom mb-3">
                                                <label>Ngày bắt đầu *</label>
                                                <input
                                                    type="date"
                                                    className="form-control-custom"
                                                    ref={startDateRef}
                                                    value={currentPromotion.startDate}
                                                    min={isEditing ? '' : getTodayDateString()}
                                                    onChange={(e) => {
                                                        clearFieldValidity(startDateRef);
                                                        clearFieldValidity(endDateRef);
                                                        setCurrentPromotion({ ...currentPromotion, startDate: e.target.value });
                                                    }}
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
                                                    ref={endDateRef}
                                                    value={currentPromotion.endDate}
                                                    onChange={(e) => {
                                                        clearFieldValidity(endDateRef);
                                                        setCurrentPromotion({ ...currentPromotion, endDate: e.target.value });
                                                    }}
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
                                                    min="1"
                                                    ref={maxUsageRef}
                                                    value={currentPromotion.maxUsage}
                                                    onChange={(e) => {
                                                        clearFieldValidity(maxUsageRef);
                                                        setCurrentPromotion({ ...currentPromotion, maxUsage: e.target.value });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-col">
                                            <div className="form-group-custom mb-3">
                                                <label>Giới hạn / user</label>
                                                <input
                                                    type="number"
                                                    className="form-control-custom"
                                                    placeholder="Để trống = không giới hạn"
                                                    min="1"
                                                    ref={maxUsagePerUserRef}
                                                    value={currentPromotion.maxUsagePerUser}
                                                    onChange={(e) => {
                                                        clearFieldValidity(maxUsagePerUserRef);
                                                        setCurrentPromotion({ ...currentPromotion, maxUsagePerUser: e.target.value });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-col">
                                            <div className="form-group-custom mb-3">
                                                <label>Đơn hàng tối thiểu (đ)</label>
                                                <input
                                                    type="number"
                                                    step="1000"
                                                    className="form-control-custom"
                                                    placeholder="0"
                                                    ref={minOrderAmountRef}
                                                    value={currentPromotion.minOrderAmount}
                                                    onChange={(e) => {
                                                        clearFieldValidity(minOrderAmountRef);
                                                        setCurrentPromotion({ ...currentPromotion, minOrderAmount: e.target.value });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-col">
                                            <div className="form-group-custom mb-3">
                                                <label>Giảm tối đa (đ)</label>
                                                <input
                                                    type="number"
                                                    step="1000"
                                                    className="form-control-custom"
                                                    placeholder="Để trống = không giới hạn"
                                                    ref={maxDiscountAmountRef}
                                                    value={currentPromotion.maxDiscountAmount}
                                                    onChange={(e) => {
                                                        clearFieldValidity(maxDiscountAmountRef);
                                                        setCurrentPromotion({ ...currentPromotion, maxDiscountAmount: e.target.value });
                                                    }}
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
