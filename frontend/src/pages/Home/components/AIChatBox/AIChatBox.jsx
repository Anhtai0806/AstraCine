import { useState } from "react";
import "./AIChatBox.css";
import chatIcon from "../../../../assets/chat-icon.png";
import { IoClose } from "react-icons/io5";
import { SiProbot } from "react-icons/si";

const AIChatBox = () => {
  const [showGreeting, setShowGreeting] = useState(true);
  const [open, setOpen] = useState(false);

  return (
    <div className="ai-chat-container">
      {!open && showGreeting && (
        <div className="chat-greeting">
          <span>🤖 Cần hỗ trợ? Chat với mình nhé!</span>
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
            setShowGreeting(false); // 🔥 ẩn greeting
          }}
        >
          <img src={chatIcon} alt="chat" />
        </button>
      )}

      {open && (
        <div className="chat-box">
          <div className="chat-header">
            <span className="header-title-ai">
              {" "}
              <SiProbot className="AI-icon" />
              AI Support
            </span>
            <button className="close-btn-chat" onClick={() => setOpen(false)}>
              <IoClose />
            </button>
          </div>

          <div className="chat-body">
            <p>Xin chào bạn cần hỗ trợ gì?</p>
          </div>

          <div className="chat-input">
            <input placeholder="Nhập tin nhắn..." />
            <button>Gửi</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChatBox;
