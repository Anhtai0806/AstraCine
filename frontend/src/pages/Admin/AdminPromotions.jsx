import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';
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
            <Badge bg="success">Active</Badge> :
            <Badge bg="secondary">Inactive</Badge>;
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
                <Spinner animation="border" />
            </div>
        </div>
    );

    return (
        <div className="admin-promotions-page">
            <Container className="admin-promotions-container">
                <div className="admin-promotions-header">
                    <h2><FaTicketAlt className="me-2" />Quản lý Mã Khuyến Mãi</h2>
                    <Button variant="primary" className="btn-add-promotion" onClick={() => handleShowModal()}>
                        <FaPlus className="me-2" /> Thêm Mã Khuyến Mãi
                    </Button>
                </div>

                {error && <Alert variant="danger" className="alert-custom" dismissible onClose={() => setError(null)}>{error}</Alert>}

                <Table striped bordered hover responsive className="promotions-table">
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
                                            <Button variant="warning" size="sm" className="btn-edit-promotion" onClick={() => handleShowModal(promotion)}>
                                                <FaEdit />
                                            </Button>
                                            <Button variant="danger" size="sm" className="btn-delete-promotion" onClick={() => handleDelete(promotion.id)}>
                                                <FaTrash />
                                            </Button>
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
                </Table>

                <Modal
                    show={showModal}
                    onHide={handleCloseModal}
                    className="promotion-modal"
                    backdrop="static"
                    enforceFocus={false}
                    size="lg"
                >
                    <Modal.Header closeButton>
                        <Modal.Title>{isEditing ? 'Chỉnh sửa Mã Khuyến Mãi' : 'Thêm Mã Khuyến Mãi Mới'}</Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleSave}>
                        <Modal.Body>
                            <Form.Group controlId="promotionCode" className="mb-3">
                                <Form.Label>Mã khuyến mãi *</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="VD: SUMMER2026"
                                    value={currentPromotion.code}
                                    onChange={(e) => setCurrentPromotion({ ...currentPromotion, code: e.target.value.toUpperCase() })}
                                    required
                                />
                                <Form.Text className="text-muted">
                                    Chỉ sử dụng chữ in hoa, số, gạch dưới và gạch ngang
                                </Form.Text>
                            </Form.Group>

                            <Form.Group controlId="promotionDescription" className="mb-3">
                                <Form.Label>Mô tả</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    placeholder="Mô tả về chương trình khuyến mãi"
                                    value={currentPromotion.description}
                                    onChange={(e) => setCurrentPromotion({ ...currentPromotion, description: e.target.value })}
                                />
                            </Form.Group>

                            <div className="row">
                                <div className="col-md-6">
                                    <Form.Group controlId="discountType" className="mb-3">
                                        <Form.Label>Loại giảm giá *</Form.Label>
                                        <Form.Select
                                            value={currentPromotion.discountType}
                                            onChange={(e) => setCurrentPromotion({ ...currentPromotion, discountType: e.target.value })}
                                            required
                                        >
                                            <option value="PERCENTAGE">Phần trăm (%)</option>
                                            <option value="FIXED">Số tiền cố định (đ)</option>
                                        </Form.Select>
                                    </Form.Group>
                                </div>
                                <div className="col-md-6">
                                    <Form.Group controlId="discountValue" className="mb-3">
                                        <Form.Label>Giá trị giảm *</Form.Label>
                                        <Form.Control
                                            type="number"
                                            step="0.01"
                                            placeholder={currentPromotion.discountType === 'PERCENTAGE' ? '0-100' : 'Số tiền'}
                                            value={currentPromotion.discountValue}
                                            onChange={(e) => setCurrentPromotion({ ...currentPromotion, discountValue: e.target.value })}
                                            required
                                        />
                                    </Form.Group>
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-md-6">
                                    <Form.Group controlId="startDate" className="mb-3">
                                        <Form.Label>Ngày bắt đầu *</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={currentPromotion.startDate}
                                            onChange={(e) => setCurrentPromotion({ ...currentPromotion, startDate: e.target.value })}
                                            required
                                        />
                                    </Form.Group>
                                </div>
                                <div className="col-md-6">
                                    <Form.Group controlId="endDate" className="mb-3">
                                        <Form.Label>Ngày kết thúc *</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={currentPromotion.endDate}
                                            onChange={(e) => setCurrentPromotion({ ...currentPromotion, endDate: e.target.value })}
                                            required
                                        />
                                    </Form.Group>
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-md-6">
                                    <Form.Group controlId="maxUsage" className="mb-3">
                                        <Form.Label>Giới hạn sử dụng</Form.Label>
                                        <Form.Control
                                            type="number"
                                            placeholder="Để trống = không giới hạn"
                                            value={currentPromotion.maxUsage}
                                            onChange={(e) => setCurrentPromotion({ ...currentPromotion, maxUsage: e.target.value })}
                                        />
                                        <Form.Text className="text-muted">
                                            Số lần tối đa mã có thể được sử dụng
                                        </Form.Text>
                                    </Form.Group>
                                </div>
                                <div className="col-md-6">
                                    <Form.Group controlId="minOrderAmount" className="mb-3">
                                        <Form.Label>Đơn hàng tối thiểu (đ)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            step="1000"
                                            placeholder="0"
                                            value={currentPromotion.minOrderAmount}
                                            onChange={(e) => setCurrentPromotion({ ...currentPromotion, minOrderAmount: e.target.value })}
                                        />
                                    </Form.Group>
                                </div>
                            </div>

                            <Form.Group controlId="status" className="mb-3">
                                <Form.Label>Trạng thái *</Form.Label>
                                <Form.Select
                                    value={currentPromotion.status}
                                    onChange={(e) => setCurrentPromotion({ ...currentPromotion, status: e.target.value })}
                                    required
                                >
                                    <option value="ACTIVE">Hoạt động</option>
                                    <option value="INACTIVE">Không hoạt động</option>
                                </Form.Select>
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleCloseModal}>
                                Hủy
                            </Button>
                            <Button variant="primary" type="submit">
                                {isEditing ? 'Cập nhật' : 'Tạo mới'}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
            </Container>
        </div>
    );
};

export default AdminPromotions;
