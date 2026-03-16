import React, { useEffect, useMemo, useState } from "react";
import { comboAPI } from "../../services/api";
import { staffApi } from "../../api/staffApi";
import "./StaffComboSale.css";

const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount || 0);

function StaffComboSale() {
    const [combos, setCombos] = useState([]);
    const [keyword, setKeyword] = useState("");
    const [cart, setCart] = useState({});
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [customerUsername, setCustomerUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    const fetchCombos = async () => {
        try {
            setLoading(true);
            const res = await comboAPI.search("", 0, 2000000);
            setCombos(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setMessage("Không tải được danh sách combo.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCombos();
    }, []);

    const filteredCombos = useMemo(() => {
        return combos.filter((item) =>
            (item.name || "").toLowerCase().includes(keyword.toLowerCase())
        );
    }, [combos, keyword]);

    const cartItems = useMemo(() => {
        return combos
            .filter((combo) => cart[combo.id] > 0)
            .map((combo) => ({
                ...combo,
                quantity: cart[combo.id],
                subtotal: (combo.price || 0) * cart[combo.id],
            }));
    }, [combos, cart]);

    const totalAmount = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

    const addToCart = (combo) => {
        if (combo.status !== "ACTIVE") return;
        setCart((prev) => ({
            ...prev,
            [combo.id]: (prev[combo.id] || 0) + 1,
        }));
    };

    const removeFromCart = (comboId) => {
        setCart((prev) => {
            const next = { ...prev };
            if (!next[comboId]) return next;
            if (next[comboId] <= 1) delete next[comboId];
            else next[comboId] -= 1;
            return next;
        });
    };

    const clearCart = () => {
        setCart({});
    };

    const handleSubmit = async () => {
        setMessage("");

        if (cartItems.length === 0) {
            setMessage("Vui lòng chọn ít nhất 1 combo.");
            return;
        }

        const confirmed = window.confirm("Bạn có chắc muốn tạo hóa đơn mua combo riêng này không?");
        if (!confirmed) return;

        try {
            setSubmitting(true);

            const payload = {
                customerUsername: customerUsername.trim(),
                paymentMethod,
                items: cartItems.map((item) => ({
                    comboId: item.id,
                    quantity: item.quantity,
                })),
            };

            const data = await staffApi.createComboSale(payload);

            setMessage(
                `Tạo hóa đơn thành công. Mã hóa đơn: #${data.invoiceId} - Tổng tiền: ${formatCurrency(
                    data.totalAmount
                )}`
            );

            setCart({});
            setCustomerUsername("");
            setPaymentMethod("CASH");
        } catch (err) {
            console.error(err);
            setMessage(
                err?.response?.data?.message || "Tạo hóa đơn mua combo thất bại."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="staff-combo-page">
            <div className="staff-combo-header">
                <div>
                    <div className="staff-combo-kicker">STAFF</div>
                    <h1>Mua combo bắp nước riêng</h1>
                    <p>Tạo hóa đơn tại quầy chỉ gồm combo, không cần chọn vé hay suất chiếu.</p>
                </div>
            </div>

            {message && <div className="staff-combo-alert">{message}</div>}

            <div className="staff-combo-layout">
                <div className="staff-combo-main">
                    <div className="staff-combo-toolbar">
                        <input
                            type="text"
                            placeholder="Tìm theo tên combo..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </div>

                    {loading ? (
                        <div className="staff-combo-empty">Đang tải danh sách combo...</div>
                    ) : filteredCombos.length === 0 ? (
                        <div className="staff-combo-empty">Không có combo phù hợp.</div>
                    ) : (
                        <div className="staff-combo-grid">
                            {filteredCombos.map((item) => {
                                const qty = cart[item.id] || 0;
                                const isActive = item.status === "ACTIVE";

                                return (
                                    <div
                                        key={item.id}
                                        className={`staff-combo-card ${!isActive ? "disabled" : ""}`}
                                    >
                                        <div className="staff-combo-card-body">
                                            <h3>{item.name}</h3>
                                            <div className="staff-combo-price">{formatCurrency(item.price)}</div>

                                            {!isActive ? (
                                                <div className="staff-combo-inactive">Ngừng bán</div>
                                            ) : qty === 0 ? (
                                                <button type="button" onClick={() => addToCart(item)}>
                                                    + Thêm vào đơn
                                                </button>
                                            ) : (
                                                <div className="staff-combo-qty">
                                                    <button type="button" onClick={() => removeFromCart(item.id)}>
                                                        −
                                                    </button>
                                                    <span>{qty}</span>
                                                    <button type="button" onClick={() => addToCart(item)}>
                                                        +
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <aside className="staff-combo-sidebar">
                    <h3>Thông tin hóa đơn</h3>

                    <div className="staff-form-group">
                        <label>Khách hàng (tuỳ chọn)</label>
                        <input
                            type="text"
                            placeholder="Nhập username khách nếu muốn gắn lịch sử"
                            value={customerUsername}
                            onChange={(e) => setCustomerUsername(e.target.value)}
                        />
                    </div>

                    <div className="staff-form-group">
                        <label>Phương thức thanh toán</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                            <option value="CASH">Tiền mặt</option>
                            <option value="CARD">Thẻ</option>
                        </select>
                    </div>

                    <div className="staff-order-items">
                        {cartItems.length === 0 ? (
                            <div className="staff-combo-empty small">Chưa có combo nào trong đơn.</div>
                        ) : (
                            cartItems.map((item) => (
                                <div className="staff-order-item" key={item.id}>
                                    <div>
                                        <strong>{item.name}</strong>
                                        <div className="muted">
                                            {formatCurrency(item.price)} x {item.quantity}
                                        </div>
                                    </div>
                                    <div>{formatCurrency(item.subtotal)}</div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="staff-order-total">
                        <span>Tổng cộng</span>
                        <strong>{formatCurrency(totalAmount)}</strong>
                    </div>

                    <div className="staff-order-actions">
                        <button type="button" className="secondary" onClick={clearCart} disabled={submitting}>
                            Xoá đơn
                        </button>
                        <button type="button" onClick={handleSubmit} disabled={submitting || cartItems.length === 0}>
                            {submitting ? "Đang tạo..." : "Tạo hóa đơn combo"}
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default StaffComboSale;