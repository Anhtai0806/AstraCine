export function buildSeatSelectionPath(isStaffMode, showtimeId) {
  return isStaffMode ? `/staff/showtimes/${showtimeId}` : `/booking/showtimes/${showtimeId}`;
}

export function buildExpiredSeatRedirectState({ movieTitle, startTime, endTime, roomName }) {
  return {
    movieTitle: movieTitle || null,
    startTime: startTime || null,
    endTime: endTime || null,
    roomName: roomName || null,
    holdExpired: true,
  };
}

export function getRemainingHoldSeconds(expiresAt) {
  const value = Number(expiresAt || 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.max(0, Math.floor((value - Date.now()) / 1000));
}
