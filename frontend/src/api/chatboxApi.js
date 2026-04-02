import axios from "axios";

const API_BASE_URL = "http://localhost:8080/api/public/chatbox";

function getGuestId() {
  const key = "guestUserId";
  let id = localStorage.getItem(key);
  if (id) return id;
  try {
    id =
      (crypto.randomUUID && crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  } catch (_) {
    id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  localStorage.setItem(key, id);
  return id;
}

function getBearerToken() {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    null
  );
}

function buildHeaders() {
  const token = getBearerToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }

  let username = null;
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.username) username = user.username;
  } catch (_) {}

  return { "X-User-Id": username || getGuestId() };
}

const chatboxApi = {
  sendMessage: async ({ message, history = [], sessionId = null }) => {
    const response = await axios.post(
      `${API_BASE_URL}/message`,
      {
        message,
        history,
        sessionId,
      },
      {
        headers: buildHeaders(),
      }
    );

    return response.data;
  },
};

export default chatboxApi;
