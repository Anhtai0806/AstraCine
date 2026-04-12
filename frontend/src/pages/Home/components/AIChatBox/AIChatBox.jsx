import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AIChatBox.css";
import chatIcon from "../../../../assets/chat-icon.png";
import { IoClose } from "react-icons/io5";
import { SiProbot } from "react-icons/si";
import chatboxApi from "../../../../api/chatboxApi";
import { useAuth } from "../../../../contexts/AuthContext";

const INITIAL_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "Xin chào! Mình có thể tư vấn phim, gợi ý suất chiếu và hỗ trợ đặt vé ngay trong khung chat này.",
  suggestedMovies: [],
  suggestedShowtimes: [],
  suggestedCombos: [],
  source: "system",
  usedAi: false,
  bookingState: null,
  payment: null,
  ticket: null,
};

const formatDateTime = (value) =>
  value ? String(value).replace("T", " ").slice(0, 16) : "";

const getSeatTypeClass = (seatType) => `seat-type-${String(seatType || "NORMAL").toLowerCase()}`;
const getSeatStatusClass = (status) => `seat-status-${String(status || "AVAILABLE").toLowerCase()}`;
const HIDDEN_SUGGESTION_SOURCES = new Set([]);
const HIDDEN_MOVIE_SOURCES = new Set(["booking-payment", "booking-await-payment", "booking-ticket"]);
const HIDDEN_SHOWTIME_SOURCES = new Set(["booking-payment", "booking-await-payment", "booking-ticket"]);
const HIDDEN_COMBO_SOURCES = new Set([
  "booking-collect-movie",
  "booking-payment",
  "booking-await-payment",
  "booking-no-exact-showtime",
]);
const HIDDEN_BOOKING_STATE_SOURCES = new Set([
  "booking-collect-movie",
  "booking-ticket",
  "booking-no-exact-showtime",
]);
const LEGACY_CHAT_STORAGE_KEY = "ai-chatbox-state-v1";
const CHAT_STORAGE_PREFIX = "ai-chatbox-state-v2";
const CHAT_STORAGE_LIMIT = 40;
const CHAT_STORAGE_TTL_MS = 24 * 60 * 60 * 1000;
const AUTO_PAYMENT_SYNC_MESSAGE = "xong";
const PENDING_PAYMENT_SOURCES = new Set(["booking-payment", "booking-await-payment"]);

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

const resolveChatScope = (authUser) => {
  const user = authUser || readStoredUser();
  const userId = user?.id || user?.username || user?.email || user?.phone || null;
  if (userId) {
    return `user:${String(userId)}`;
  }

  const guestId = localStorage.getItem("guestUserId");
  if (guestId) {
    return `guest:${guestId}`;
  }

  return "guest:anonymous";
};

const getChatStorageKey = (authUser) => `${CHAT_STORAGE_PREFIX}:${resolveChatScope(authUser)}`;

const cleanupExpiredChatStorage = () => {
  const now = Date.now();
  const keysToRemove = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith(`${CHAT_STORAGE_PREFIX}:`)) {
      continue;
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "{}");
      if (!parsed?.expiresAt || parsed.expiresAt <= now) {
        keysToRemove.push(key);
      }
    } catch (_) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

const normalizeStoredMessage = (item, index) => {
  if (!item || typeof item !== "object") return null;
  const role = item.role === "user" ? "user" : "assistant";
  const content = typeof item.content === "string" ? item.content : "";
  if (!content.trim()) return null;

  return {
    id: item.id || `stored-${role}-${index}`,
    role,
    content,
    suggestedMovies: Array.isArray(item.suggestedMovies) ? item.suggestedMovies : [],
    suggestedShowtimes: Array.isArray(item.suggestedShowtimes) ? item.suggestedShowtimes : [],
    suggestedCombos: Array.isArray(item.suggestedCombos) ? item.suggestedCombos : [],
    source: item.source || "stored",
    usedAi: Boolean(item.usedAi),
    bookingState: item.bookingState || null,
    payment: item.payment || null,
    ticket: item.ticket || null,
  };
};

const loadStoredChatState = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(storageKey);
      return null;
    }

    const storedMessages = Array.isArray(parsed?.messages)
      ? parsed.messages
          .map((item, index) => normalizeStoredMessage(item, index))
          .filter(Boolean)
      : [];

    return {
      sessionId: parsed?.sessionId || null,
      messages: storedMessages.length > 0 ? storedMessages : [INITIAL_MESSAGE],
    };
  } catch (error) {
    console.warn("Cannot load chatbox state from localStorage", error);
    return null;
  }
};

const saveStoredChatState = ({ storageKey, sessionId, messages }) => {
  try {
    const payload = {
      sessionId: sessionId || null,
      messages: messages.slice(-CHAT_STORAGE_LIMIT),
      savedAt: Date.now(),
      expiresAt: Date.now() + CHAT_STORAGE_TTL_MS,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (error) {
    console.warn("Cannot save chatbox state to localStorage", error);
  }
};

const AIChatBox = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const authUser = auth?.user || null;
  const [showGreeting, setShowGreeting] = useState(true);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [syncingPayment, setSyncingPayment] = useState(false);
  const [storageKey, setStorageKey] = useState(null);
  const [storageReady, setStorageReady] = useState(false);
  const autoPaymentSyncedOrderRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    cleanupExpiredChatStorage();
    localStorage.removeItem(LEGACY_CHAT_STORAGE_KEY);
  }, []);

  useEffect(() => {
    setStorageKey(getChatStorageKey(authUser));
  }, [authUser?.id, authUser?.username, authUser?.email, authUser?.phone]);

  useEffect(() => {
    if (!storageKey) return;

    setStorageReady(false);
    const storedState = loadStoredChatState(storageKey);
    if (storedState) {
      setSessionId(storedState.sessionId);
      setMessages(storedState.messages);
    } else {
      setSessionId(null);
      setMessages([INITIAL_MESSAGE]);
    }
    setStorageReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (!storageReady || !storageKey) return;
    saveStoredChatState({ storageKey, sessionId, messages });
  }, [sessionId, messages, storageReady, storageKey]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!sessionId || syncingPayment) return;
    if (location.pathname !== "/payment/success") return;

    const query = new URLSearchParams(location.search);
    const orderCode = query.get("orderCode");
    if (!orderCode) return;
    if (autoPaymentSyncedOrderRef.current === orderCode) return;

    const latestAssistant = [...messages].reverse().find((item) => item.role === "assistant");
    if (!latestAssistant || !PENDING_PAYMENT_SOURCES.has(latestAssistant.source)) return;

    const latestOrderCode =
      latestAssistant?.payment?.orderCode != null
        ? String(latestAssistant.payment.orderCode)
        : null;
    if (latestOrderCode && latestOrderCode !== orderCode) return;

    autoPaymentSyncedOrderRef.current = orderCode;
    setSyncingPayment(true);

    (async () => {
      try {
        const response = await chatboxApi.sendMessage({
          message: AUTO_PAYMENT_SYNC_MESSAGE,
          history: buildHistoryPayload(messages),
          sessionId,
        });

        if (response?.sessionId) {
          setSessionId(response.sessionId);
        }

        setMessages((current) => [
          ...current,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content:
              response?.reply ||
              "MÃ¬nh chÆ°a nháº­n Ä‘Æ°á»£c pháº£n há»“i phÃ¹ há»£p. Báº¡n thá»­ há»i láº¡i giÃºp mÃ¬nh nhÃ©.",
            suggestedMovies: response?.suggestedMovies || [],
            suggestedShowtimes: response?.suggestedShowtimes || [],
            suggestedCombos: response?.suggestedCombos || [],
            source: response?.source || "unknown",
            usedAi: Boolean(response?.usedAi),
            bookingState: response?.bookingState || null,
            payment: response?.payment || null,
            ticket: response?.ticket || null,
          },
        ]);
      } catch (error) {
        autoPaymentSyncedOrderRef.current = null;
        console.error("Auto payment sync failed", error);
      } finally {
        setSyncingPayment(false);
      }
    })();
  }, [location.pathname, location.search, messages, sessionId, syncingPayment]);

  const buildHistoryPayload = (items) =>
    items
      .filter((item) => item.role === "user" || item.role === "assistant")
      .slice(-8)
      .map((item) => ({
        role: item.role,
        content: item.content,
      }));

  const handleSend = async () => {
    const message = input.trim();
    if (!message || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      suggestedMovies: [],
      suggestedShowtimes: [],
      suggestedCombos: [],
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await chatboxApi.sendMessage({
        message,
        history: buildHistoryPayload(nextMessages),
        sessionId,
      });

      if (response?.sessionId) {
        setSessionId(response.sessionId);
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content:
            response?.reply ||
            "Mình chưa nhận được phản hồi phù hợp. Bạn thử hỏi lại giúp mình nhé.",
          suggestedMovies: response?.suggestedMovies || [],
          suggestedShowtimes: response?.suggestedShowtimes || [],
          suggestedCombos: response?.suggestedCombos || [],
          source: response?.source || "unknown",
          usedAi: Boolean(response?.usedAi),
          bookingState: response?.bookingState || null,
          payment: response?.payment || null,
          ticket: response?.ticket || null,
        },
      ]);
    } catch (error) {
      console.error("Chatbox request failed", error);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content:
            error?.response?.data?.message ||
            "Chatbox đang tạm bận. Bạn thử lại sau ít phút nhé.",
          suggestedMovies: [],
          suggestedShowtimes: [],
          suggestedCombos: [],
          source: "error",
          usedAi: false,
          bookingState: null,
          payment: null,
          ticket: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const shouldRenderSuggestions = (message) => {
    if (message.role !== "assistant") {
      return false;
    }
    if (HIDDEN_SUGGESTION_SOURCES.has(message.source)) {
      return false;
    }
    return (
      message.source?.startsWith("booking-") ||
      message.bookingState ||
      message.payment ||
      message.ticket ||
      message.suggestedMovies?.length > 0 ||
      message.suggestedShowtimes?.length > 0 ||
      message.suggestedCombos?.length > 0
    );
  };

  const shouldRenderComboSuggestions = (message) => {
    if (HIDDEN_COMBO_SOURCES.has(message.source)) {
      return false;
    }
    return message.suggestedCombos?.length > 0;
  };

  const shouldRenderMovieSuggestions = (message) => {
    if (HIDDEN_MOVIE_SOURCES.has(message.source)) {
      return false;
    }
    return message.suggestedMovies?.length > 0;
  };

  const shouldRenderShowtimeSuggestions = (message) => {
    if (HIDDEN_SHOWTIME_SOURCES.has(message.source)) {
      return false;
    }
    return message.suggestedShowtimes?.length > 0;
  };

  const shouldRenderBookingState = (message) => {
    if (!message.bookingState) {
      return false;
    }
    if (HIDDEN_BOOKING_STATE_SOURCES.has(message.source)) {
      return false;
    }
    return true;
  };

  return (
    <div className="ai-chat-container">
      {!open && showGreeting && (
        <div className="chat-greeting">
          <span>Cần hỗ trợ? Chat với mình nhé!</span>
          <button className="close-btn" onClick={() => setShowGreeting(false)}>
            <IoClose />
          </button>
        </div>
      )}

      {!open && (
        <button
          className="chat-toggle"
          onClick={() => {
            setOpen(true);
            setShowGreeting(false);
          }}
        >
          <img src={chatIcon} alt="chat" />
        </button>
      )}

      {open && (
        <div className="chat-box">
          <div className="chat-header">
            <span className="header-title-ai">
              <SiProbot className="AI-icon" />
              AI Support
            </span>
            <button className="close-btn-chat" onClick={() => setOpen(false)}>
              <IoClose />
            </button>
          </div>

          <div className="chat-body">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message ${
                  message.role === "user"
                    ? "chat-message-user"
                    : "chat-message-assistant"
                }`}
              >
                <div className="chat-bubble">
                  <p>{message.content}</p>

                  {shouldRenderSuggestions(message) && (
                      <div className="chat-suggestions">
                        {shouldRenderBookingState(message) && (
                          <div className="chat-suggestion-block booking-summary">
                            <div className="suggestion-title">Trạng thái đặt vé</div>
                            <div className="booking-summary-grid">
                              {message.bookingState.movieTitle && (
                                <div>
                                  <strong>Phim:</strong>{" "}
                                  {message.bookingState.movieTitle}
                                </div>
                              )}
                              {message.bookingState.showtimeStartTime && (
                                <div>
                                  <strong>Suất:</strong>{" "}
                                  {formatDateTime(
                                    message.bookingState.showtimeStartTime
                                  )}
                                </div>
                              )}
                              {message.bookingState.seatCodes?.length > 0 && (
                                <div>
                                  <strong>Ghế:</strong>{" "}
                                  {message.bookingState.seatCodes.join(", ")}
                                </div>
                              )}
                              {message.bookingState.comboItems?.length > 0 && (
                                <div>
                                  <strong>Combo:</strong>{" "}
                                  {message.bookingState.comboItems
                                    .map((item) => `${item.quantity}x ${item.name}`)
                                    .join(", ")}
                                </div>
                              )}
                              {message.bookingState.totalAmount != null && (
                                <div>
                                  <strong>Tổng dự kiến:</strong>{" "}
                                  {Number(
                                    message.bookingState.totalAmount
                                  ).toLocaleString("vi-VN")}
                                  đ
                                </div>
                              )}
                            </div>

                            {message.bookingState.seatMap?.length > 0 &&
                              (!message.bookingState.seatCodes ||
                                message.bookingState.seatCodes.length === 0) && (
                              <div className="chat-seatmap-block">
                                <div className="suggestion-title">Sơ đồ ghế</div>
                                <div className="chat-seatmap-legend">
                                  <span className="chat-seatmap-legend-item">
                                    <span className="chat-seatmap-dot seat-type-normal"></span>
                                    Thường
                                  </span>
                                  <span className="chat-seatmap-legend-item">
                                    <span className="chat-seatmap-dot seat-type-couple"></span>
                                    Couple
                                  </span>
                                  <span className="chat-seatmap-legend-item">
                                    <span className="chat-seatmap-dot seat-type-vip"></span>
                                    VIP
                                  </span>
                                  <span className="chat-seatmap-legend-item">
                                    <span className="chat-seatmap-dot seat-status-sold"></span>
                                    Đã bán
                                  </span>
                                  <span className="chat-seatmap-legend-item">
                                    <span className="chat-seatmap-dot seat-status-held"></span>
                                    Đang giữ
                                  </span>
                                </div>
                                <div className="chat-seatmap-screen">Màn hình</div>
                                <div
                                  className="chat-seatmap-grid"
                                  style={{
                                    gridTemplateColumns: `repeat(${
                                      message.bookingState.totalColumns || 10
                                    }, minmax(22px, 1fr))`,
                                  }}
                                >
                                  {message.bookingState.seatMap.map((seat) => {
                                    const seatCode = `${seat.rowLabel}${seat.columnNumber}`;
                                    const selected =
                                      message.bookingState.seatCodes?.includes(seatCode);
                                    return (
                                      <div
                                        key={`seat-${seat.seatId}`}
                                        className={`chat-seatmap-seat ${getSeatTypeClass(
                                          seat.seatType
                                        )} ${getSeatStatusClass(seat.status)} ${
                                          selected ? "chat-seatmap-seat-selected" : ""
                                        }`}
                                        title={`${seatCode} - ${seat.seatType} - ${seat.status}`}
                                      >
                                        {seatCode}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {shouldRenderMovieSuggestions(message) && (
                          <div className="chat-suggestion-block">
                            <div className="suggestion-title">Phim gợi ý</div>
                            <div className="suggestion-chips">
                              {message.suggestedMovies.map((movie) => (
                                <button
                                  key={`movie-${movie.id}`}
                                  className="suggestion-chip"
                                  onClick={() => navigate(`/movies/${movie.id}`)}
                                >
                                  {movie.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {shouldRenderShowtimeSuggestions(message) && (
                          <div className="chat-suggestion-block">
                            <div className="suggestion-title">
                              Suất chiếu phù hợp
                            </div>
                            <div className="suggestion-chips">
                              {message.suggestedShowtimes.map((showtime) => (
                                  <button
                                    key={`showtime-${showtime.id}`}
                                    className="suggestion-chip suggestion-chip-secondary"
                                    onClick={() =>
                                      navigate(`/booking/showtimes/${showtime.id}`)
                                    }
                                  >
                                    {showtime.movieTitle} -{" "}
                                    {formatDateTime(showtime.startTime)}
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                        {shouldRenderComboSuggestions(message) && (
                          <div className="chat-suggestion-block">
                            <div className="suggestion-title">Combo bắp nước</div>
                            <div className="suggestion-chips">
                              {message.suggestedCombos.map((combo) => (
                                <span
                                  key={`combo-${combo.comboId}`}
                                  className="suggestion-chip suggestion-chip-secondary"
                                >
                                  {combo.name} -{" "}
                                  {Number(combo.price || 0).toLocaleString("vi-VN")}
                                  đ
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {message.payment && (
                          <div className="chat-suggestion-block payment-block">
                            <div className="suggestion-title">Thanh toán PayOS</div>
                            {message.payment.qrCode && (
                              <img
                                className="payment-qr"
                                src={message.payment.qrCode}
                                alt="PayOS QR"
                              />
                            )}
                            <div className="booking-summary-grid">
                              <div>
                                <strong>Mã đơn:</strong> {message.payment.orderCode}
                              </div>
                              <div>
                                <strong>Trạng thái:</strong> {message.payment.status}
                              </div>
                            </div>
                            {message.payment.checkoutUrl && (
                              <a
                                className="payment-link"
                                href={message.payment.checkoutUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Mở trang thanh toán
                              </a>
                            )}
                          </div>
                        )}

                        {message.ticket && (
                          <div className="chat-suggestion-block ticket-block">
                            <div className="suggestion-title">Vé điện tử</div>
                            <div className="booking-summary-grid">
                              <div>
                                <strong>Phim:</strong> {message.ticket.movieTitle}
                              </div>
                              <div>
                                <strong>Suất:</strong>{" "}
                                {formatDateTime(message.ticket.startTime)}
                              </div>
                              <div>
                                <strong>Ghế:</strong> {message.ticket.seats}
                              </div>
                              <div>
                                <strong>Mã vé:</strong> {message.ticket.ticketCode}
                              </div>
                              <div>
                                <strong>Order:</strong> {message.ticket.orderCode}
                              </div>
                              {message.ticket.combos && (
                                <div>
                                  <strong>Combo:</strong> {message.ticket.combos}
                                </div>
                              )}
                            </div>
                            <button
                              className="payment-link payment-link-button"
                              onClick={() =>
                                navigate(`/ticket?orderCode=${message.ticket.orderCode}`)
                              }
                            >
                              Xem vé chi tiết
                            </button>
                          </div>
                        )}

                        <div className="chat-source">
                          {message.usedAi
                            ? "Phản hồi bởi AI"
                            : "Phản hồi từ backend / dữ liệu rạp"}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-message chat-message-assistant">
                <div className="chat-bubble chat-bubble-loading">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
            />
            <button onClick={handleSend} disabled={loading || !input.trim()}>
              {loading ? "Đang gửi" : "Gửi"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChatBox;
