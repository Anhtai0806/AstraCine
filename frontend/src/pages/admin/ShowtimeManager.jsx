import React, { useEffect, useMemo, useRef, useState } from 'react';
import axiosClient from '../../services/axiosClient';
import SeatGrid from '../../components/admin/SeatGrid';
import './ShowtimeManager.css';

const START_HOUR = 0;
const END_HOUR = 24;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const CLEANUP_MINUTES = 15;
const DEFAULT_AUTO_FORM = {
    scheduleDate: '',
    openingTime: '07:00',
    closingTime: '02:00',
    movieIds: [],
    roomIds: [],
};

const formatDateKey = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const roundToQuarter = (minutes) => Math.round(minutes / 15) * 15;

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

const normalizeDateString = (value) => {
    if (!value) return '';
    return String(value).slice(0, 10);
};

const formatLocalDateTime = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const getDayBounds = (value) => {
    const dayKey = formatDateKey(value);
    const nextDay = new Date(`${dayKey}T00:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    return {
        dayStart: new Date(`${dayKey}T00:00:00`),
        dayEnd: nextDay,
    };
};

const overlapsDay = (showtime, value) => {
    const { dayStart, dayEnd } = getDayBounds(value);
    const start = new Date(showtime.startTime);
    const end = new Date(showtime.endTime);

    return start < dayEnd && end > dayStart;
};

const getTimelineCardMeta = (showtime, value) => {
    const { dayStart, dayEnd } = getDayBounds(value);
    const start = new Date(showtime.startTime);
    const end = new Date(showtime.endTime);
    const visibleStart = start < dayStart ? dayStart : start;
    const visibleEnd = end > dayEnd ? dayEnd : end;
    const startMinutes = visibleStart.getHours() * 60 + visibleStart.getMinutes();
    const visibleMinutes = Math.max(15, Math.ceil((visibleEnd - visibleStart) / 60000));
    const boundedStartMinutes = Math.max(0, Math.min(startMinutes, TOTAL_MINUTES));
    const boundedDuration = Math.max(15, Math.min(visibleMinutes, TOTAL_MINUTES - boundedStartMinutes));
    const startsBeforeDay = start < dayStart;
    const endsAfterDay = end > dayEnd;
    const isCompact = boundedDuration <= 60;
    const isTiny = boundedDuration <= 35;
    const needsReadableBoost = (startsBeforeDay || endsAfterDay) && boundedDuration <= 45;

    return {
        style: {
            left: `${(boundedStartMinutes / TOTAL_MINUTES) * 100}%`,
            width: `${(boundedDuration / TOTAL_MINUTES) * 100}%`,
            minWidth: needsReadableBoost ? '94px' : undefined,
        },
        startsBeforeDay,
        endsAfterDay,
        isCompact,
        isTiny,
        needsReadableBoost,
    };
};

const isMovieAvailableOnDate = (movie, scheduleDate) => {
    if (!movie || movie.status === 'STOPPED' || !scheduleDate) return false;

    const releaseDate = normalizeDateString(movie.releaseDate);
    const endDate = normalizeDateString(movie.endDate);

    if (!releaseDate) return false;

    if (scheduleDate < releaseDate) return false;
    if (endDate && scheduleDate > endDate) return false;

    return true;
};

const ShowtimeManager = () => {
    const [view, setView] = useState('timeline');
    const [date, setDate] = useState(new Date());
    const timelineWrapperRef = useRef(null);
    const previewKeyCounterRef = useRef(0);

    const [movies, setMovies] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [showtimes, setShowtimes] = useState([]);

    const [modal, setModal] = useState(null);
    const [createForm, setCreateForm] = useState({
        id: null,
        previewKey: null,
        isPreview: false,
        movieId: '',
        roomId: '',
        startTime: '',
        date: '',
    });
    const [autoForm, setAutoForm] = useState(DEFAULT_AUTO_FORM);
    const [selectedSeats, setSelectedSeats] = useState(null);
    const [roomCols, setRoomCols] = useState(10);
    const [loading, setLoading] = useState(false);
    const [previewShowtimes, setPreviewShowtimes] = useState([]);
    const [previewRequest, setPreviewRequest] = useState(null);
    const [previewMessage, setPreviewMessage] = useState('');
    const [savingPreview, setSavingPreview] = useState(false);
    const [cleanupDeleting, setCleanupDeleting] = useState(false);
    const [cleanupForm, setCleanupForm] = useState({
        deleteAll: false,
        roomIds: [],
        movieIds: [],
    });

    useEffect(() => {
        loadData();
    }, []);

    const activeMovies = useMemo(() => movies.filter((movie) => movie.status !== 'STOPPED'), [movies]);
    const createAvailableMovies = useMemo(
        () => activeMovies.filter((movie) => isMovieAvailableOnDate(movie, createForm.date)),
        [activeMovies, createForm.date]
    );
    const autoAvailableMovies = useMemo(
        () => activeMovies.filter((movie) => isMovieAvailableOnDate(movie, autoForm.scheduleDate)),
        [activeMovies, autoForm.scheduleDate]
    );
    const displayedShowtimes = useMemo(
        () => [...showtimes, ...previewShowtimes],
        [showtimes, previewShowtimes]
    );
    const selectedScheduleDate = useMemo(() => formatDateKey(date), [date]);
    const dayPersistedShowtimes = useMemo(
        () => showtimes.filter((showtime) => showtime.startTime.startsWith(selectedScheduleDate)),
        [showtimes, selectedScheduleDate]
    );
    const cleanupTargetShowtimes = useMemo(() => {
        if (cleanupForm.deleteAll) {
            return dayPersistedShowtimes;
        }

        return dayPersistedShowtimes.filter((showtime) => {
            const matchesRoom = cleanupForm.roomIds.length
                ? cleanupForm.roomIds.includes(Number(showtime.roomId))
                : true;
            const matchesMovie = cleanupForm.movieIds.length
                ? cleanupForm.movieIds.includes(Number(showtime.movieId))
                : true;
            return matchesRoom && matchesMovie;
        });
    }, [cleanupForm.deleteAll, cleanupForm.movieIds, cleanupForm.roomIds, dayPersistedShowtimes]);
    const hasCleanupCriteria = cleanupForm.roomIds.length > 0 || cleanupForm.movieIds.length > 0;

    const nextPreviewKey = () => {
        previewKeyCounterRef.current += 1;
        return `preview-${Date.now()}-${previewKeyCounterRef.current}`;
    };

    const attachPreviewKey = (showtime) => ({
        ...showtime,
        previewKey: showtime.previewKey || nextPreviewKey(),
    });

    const sortShowtimesByStartTime = (items) => [...items].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    const buildPreviewShowtimeDraft = (formState) => {
        const movie = movies.find((item) => String(item.id) === String(formState.movieId));
        const room = rooms.find((item) => String(item.id) === String(formState.roomId));

        if (!movie || !room) {
            throw new Error('Không tìm thấy phim hoặc phòng chiếu để cập nhật bản xem trước');
        }

        const startTime = `${formState.date}T${formState.startTime}:00`;
        const endDate = new Date(startTime);
        endDate.setMinutes(endDate.getMinutes() + (movie.durationMinutes || 0));

        return {
            id: null,
            previewKey: formState.previewKey || nextPreviewKey(),
            movieId: Number(movie.id),
            roomId: Number(room.id),
            startTime,
            endTime: formatLocalDateTime(endDate),
            status: 'PREVIEW',
            movieTitle: movie.title,
            roomName: room.name,
            movieDuration: movie.durationMinutes,
        };
    };

    const validatePreviewDraft = (draft, excludedPreviewKey = null) => {
        const draftStart = new Date(draft.startTime);
        const draftEnd = new Date(draft.endTime);
        const cleanupMs = CLEANUP_MINUTES * 60 * 1000;

        const hasConflict = displayedShowtimes.some((showtime) => {
            if (Number(showtime.roomId) !== Number(draft.roomId)) return false;
            if (showtime.status === 'PREVIEW' && showtime.previewKey === excludedPreviewKey) return false;

            const showtimeStart = new Date(showtime.startTime).getTime();
            const showtimeEnd = new Date(showtime.endTime).getTime();

            return draftStart.getTime() < showtimeEnd + cleanupMs
                && draftEnd.getTime() + cleanupMs > showtimeStart;
        });

        if (hasConflict) {
            throw new Error('Suất chiếu xem trước đang bị trùng phòng hoặc chưa đủ 15 phút dọn dẹp');
        }
    };

    useEffect(() => {
        if (!createForm.movieId) return;

        const isSelectedMovieAvailable = createAvailableMovies.some(
            (movie) => String(movie.id) === String(createForm.movieId)
        );

        if (isSelectedMovieAvailable) return;

        setCreateForm((prev) => ({
            ...prev,
            movieId: '',
        }));
    }, [createAvailableMovies, createForm.movieId]);

    useEffect(() => {
        const availableMovieIds = autoAvailableMovies.map((movie) => movie.id);

        setAutoForm((prev) => {
            const nextMovieIds = prev.movieIds.filter((movieId) => availableMovieIds.includes(movieId));

            if (nextMovieIds.length === prev.movieIds.length) {
                return prev;
            }

            return {
                ...prev,
                movieIds: nextMovieIds,
            };
        });
    }, [autoAvailableMovies]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [movieRes, roomRes, showtimeRes] = await Promise.all([
                axiosClient.get('/admin/movies'),
                axiosClient.get('/admin/rooms/active'),
                axiosClient.get('/admin/showtimes')
            ]);

            setMovies(movieRes.data || []);
            setRooms(roomRes.data || []);
            setShowtimes(showtimeRes.data || []);
        } catch (error) {
            alert(getErrorMessage(error, 'Không thể tải dữ liệu lịch chiếu'));
        } finally {
            setLoading(false);
        }
    };

    const generateCalendarGrid = (currentDate) => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        return Array.from({ length: 42 }, (_, index) => {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + index);
            return day;
        });
    };

    const handleNav = (direction) => {
        const newDate = new Date(date);
        if (view === 'timeline') {
            newDate.setDate(newDate.getDate() + direction);
        } else {
            newDate.setMonth(newDate.getMonth() + direction);
        }
        setDate(newDate);

        if (view === 'timeline' && timelineWrapperRef.current) {
            const nextScrollLeft = direction > 0
                ? 0
                : timelineWrapperRef.current.scrollWidth - timelineWrapperRef.current.clientWidth;

            requestAnimationFrame(() => {
                if (!timelineWrapperRef.current) return;
                timelineWrapperRef.current.scrollTo({
                    left: Math.max(0, nextScrollLeft),
                    behavior: 'smooth',
                });
            });
        }
    };

    const openCreateModal = (roomId = rooms[0]?.id || '', time = '') => {
        setCreateForm({
            id: null,
            previewKey: null,
            isPreview: Boolean(previewRequest),
            movieId: '',
            roomId,
            startTime: time,
            date: formatDateKey(date),
        });
        setModal({ type: 'create' });
    };

    const openEditModal = (showtime) => {
        setCreateForm({
            id: showtime.id,
            previewKey: showtime.previewKey || null,
            isPreview: showtime.status === 'PREVIEW',
            movieId: String(showtime.movieId),
            roomId: String(showtime.roomId),
            startTime: showtime.startTime.split('T')[1]?.slice(0, 5) || '',
            date: showtime.startTime.split('T')[0],
        });
        setModal({ type: 'create' });
    };

    const handleTrackClick = (event, roomId) => {
        if (event.target.className !== 'tl-track') return;
        const rect = event.target.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        const rawMinutes = Math.min(Math.max(percent, 0), 0.9999) * TOTAL_MINUTES;
        const roundedMinutes = roundToQuarter(rawMinutes);
        const safeMinutes = Math.min(roundedMinutes, TOTAL_MINUTES - 15);
        const hour = Math.floor(safeMinutes / 60);
        const minute = safeMinutes % 60;
        openCreateModal(String(roomId), `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    };

    const handleCreateSubmit = async (event) => {
        event.preventDefault();

        const shouldSaveToPreview = createForm.isPreview || (previewRequest && !createForm.id);

        if (shouldSaveToPreview) {
            try {
                const draft = buildPreviewShowtimeDraft(createForm);
                validatePreviewDraft(draft, createForm.previewKey);
                setPreviewShowtimes((prev) => {
                    const nextItems = prev.filter((showtime) => showtime.previewKey !== createForm.previewKey);
                    return sortShowtimesByStartTime([...nextItems, draft]);
                });
                setModal(null);
                alert(createForm.previewKey ? 'Đã cập nhật suất chiếu xem trước' : 'Đã thêm suất chiếu vào bản xem trước');
            } catch (error) {
                alert(getErrorMessage(error, 'Không thể cập nhật bản xem trước'));
            }
            return;
        }

        try {
            const payload = {
                movieId: Number(createForm.movieId),
                roomId: Number(createForm.roomId),
                startTime: `${createForm.date}T${createForm.startTime}:00`,
            };

            if (createForm.id) {
                await axiosClient.put(`/admin/showtimes/${createForm.id}`, payload);
                alert('Đã cập nhật suất chiếu');
            } else {
                await axiosClient.post('/admin/showtimes', payload);
                alert('Đã tạo lịch chiếu');
            }

            setModal(null);
            await loadData();
        } catch (error) {
            alert(getErrorMessage(error, 'Không thể lưu suất chiếu'));
        }
    };

    const handleDeleteShowtime = async () => {
        if (createForm.isPreview) {
            if (!window.confirm('Bạn có chắc muốn xóa suất chiếu khỏi bản xem trước?')) return;
            setPreviewShowtimes((prev) => prev.filter((showtime) => showtime.previewKey !== createForm.previewKey));
            setModal(null);
            alert('Đã xóa suất chiếu khỏi bản xem trước');
            return;
        }

        if (!createForm.id) return;
        if (!window.confirm('Bạn có chắc muốn xóa suất chiếu này?')) return;

        try {
            await axiosClient.delete(`/admin/showtimes/${createForm.id}`);
            alert('Đã xóa suất chiếu');
            setModal(null);
            await loadData();
        } catch (error) {
            alert(getErrorMessage(error, 'Không thể xóa suất chiếu'));
        }
    };

    const openAutoModal = () => {
        const scheduleDate = formatDateKey(date);
        const availableMovieIds = activeMovies
            .filter((movie) => isMovieAvailableOnDate(movie, scheduleDate))
            .map((movie) => movie.id);

        setAutoForm({
            scheduleDate,
            openingTime: '07:00',
            closingTime: '02:00',
            movieIds: availableMovieIds,
            roomIds: rooms.map((room) => room.id),
        });
        setModal({ type: 'auto' });
    };

    const clearPreview = () => {
        setPreviewShowtimes([]);
        setPreviewRequest(null);
        setPreviewMessage('');
    };

    const toggleSelection = (key, id) => {
        setAutoForm((prev) => ({
            ...prev,
            [key]: prev[key].includes(id)
                ? prev[key].filter((value) => value !== id)
                : [...prev[key], id],
        }));
    };

    const handleAutoSubmit = async (event) => {
        event.preventDefault();
        try {
            const payload = {
                scheduleDate: autoForm.scheduleDate,
                openingTime: autoForm.openingTime,
                closingTime: autoForm.closingTime,
                movieIds: autoForm.movieIds,
                roomIds: autoForm.roomIds,
            };

            const response = await axiosClient.post('/admin/showtimes/generate/preview', payload);
            setPreviewShowtimes(sortShowtimesByStartTime((response.data?.createdShowtimes || []).map(attachPreviewKey)));
            setPreviewRequest(payload);
            setPreviewMessage(response.data?.message || 'Đã tạo xem trước lịch chiếu');
            setDate(new Date(`${payload.scheduleDate}T00:00:00`));
            setView('timeline');
            setModal(null);
        } catch (error) {
            alert(getErrorMessage(error, 'Không thể xem trước lịch chiếu tự động'));
        }
    };

    const handleSavePreview = async () => {
        if (!previewRequest || !previewShowtimes.length || savingPreview) return;

        try {
            setSavingPreview(true);
            const response = await axiosClient.post('/admin/showtimes/generate/confirm', {
                scheduleDate: previewRequest.scheduleDate,
                showtimes: previewShowtimes.map((showtime) => ({
                    movieId: showtime.movieId,
                    roomId: showtime.roomId,
                    startTime: showtime.startTime,
                })),
            });
            alert(response.data?.message || 'Đã lưu lịch chiếu tự động');
            clearPreview();
            await loadData();
        } catch (error) {
            alert(getErrorMessage(error, 'Không thể lưu lịch chiếu xem trước'));
        } finally {
            setSavingPreview(false);
        }
    };

    const openCleanupModal = () => {
        setCleanupForm({
            deleteAll: false,
            roomIds: [],
            movieIds: [],
        });
        setModal({ type: 'cleanup' });
    };

    const toggleCleanupSelection = (key, id) => {
        setCleanupForm((prev) => ({
            ...prev,
            [key]: prev[key].includes(id)
                ? prev[key].filter((value) => value !== id)
                : [...prev[key], id],
        }));
    };

    const handleCleanupSubmit = async (event) => {
        event.preventDefault();
        if (cleanupDeleting) return;

        if (!cleanupForm.deleteAll && !hasCleanupCriteria) {
            alert('Vui lòng tích chọn ít nhất 1 phòng hoặc 1 phim, hoặc bật "Xóa tất cả"');
            return;
        }

        if (!cleanupTargetShowtimes.length) {
            alert('Không có lịch chiếu phù hợp với tiêu chí đã chọn');
            return;
        }

        const selectedRoomNames = rooms
            .filter((room) => cleanupForm.roomIds.includes(room.id))
            .map((room) => room.name);
        const selectedMovieTitles = movies
            .filter((movie) => cleanupForm.movieIds.includes(movie.id))
            .map((movie) => movie.title);
        const filterLabel = cleanupForm.deleteAll
            ? 'tất cả suất chiếu'
            : `${cleanupForm.roomIds.length ? `phòng (${selectedRoomNames.join(', ')})` : 'tất cả phòng'}${cleanupForm.roomIds.length && cleanupForm.movieIds.length ? ' và ' : ''}${cleanupForm.movieIds.length ? `phim (${selectedMovieTitles.join(', ')})` : (cleanupForm.roomIds.length ? '' : 'tất cả phim')}`;

        if (!window.confirm(`Bạn có chắc muốn xóa ${cleanupTargetShowtimes.length} suất chiếu (${filterLabel}) trong ngày ${selectedScheduleDate}?`)) {
            return;
        }

        try {
            setCleanupDeleting(true);
            if (cleanupForm.deleteAll) {
                await axiosClient.delete('/admin/showtimes', { params: { scheduleDate: selectedScheduleDate } });
                alert('Đã xóa toàn bộ lịch chiếu trong ngày');
            } else {
                const results = await Promise.allSettled(
                    cleanupTargetShowtimes.map((showtime) => axiosClient.delete(`/admin/showtimes/${showtime.id}`))
                );
                const successCount = results.filter((result) => result.status === 'fulfilled').length;
                const failedCount = results.length - successCount;

                if (failedCount > 0) {
                    alert(`Đã xóa ${successCount}/${results.length} suất chiếu. Có ${failedCount} suất chưa thể xóa.`);
                } else {
                    alert(`Đã xóa ${successCount} suất chiếu theo tiêu chí đã chọn`);
                }
            }

            setModal(null);
            await loadData();
        } catch (error) {
            alert(getErrorMessage(error, 'Không thể dọn dẹp lịch chiếu'));
        } finally {
            setCleanupDeleting(false);
        }
    };

    const openSeatModal = async (showtime) => {
        try {
            const response = await axiosClient.get(`/admin/showtimes/${showtime.id}/seats`);
            const data = response.data;
            const flatSeats = data.seatRows.flatMap((row) => row.seats).map((seat) => ({
                ...seat,
                id: seat.showtimeSeatId,
                seatType: seat.type,
                basePrice: seat.finalPrice,
            }));

            flatSeats.sort((a, b) => a.rowLabel.localeCompare(b.rowLabel) || a.columnNumber - b.columnNumber);
            const maxColumns = Math.max(...flatSeats.map((seat) => seat.columnNumber), 10);

            setRoomCols(maxColumns);
            setSelectedSeats({ ...data, seats: flatSeats });
            setModal({ type: 'seat', movieTitle: data.movieTitle });
        } catch (error) {
            alert(getErrorMessage(error, 'Không thể tải sơ đồ ghế'));
        }
    };

    const renderTimeline = () => {
        const todaysShowtimes = displayedShowtimes.filter((showtime) => overlapsDay(showtime, date));

        return (
            <div className="timeline-wrapper" ref={timelineWrapperRef}>
                <div className="timeline-body">
                    <div className="tl-header-row">
                        <div className="tl-corner">Phòng / Giờ</div>
                        <div className="tl-hours">
                            {Array.from({ length: END_HOUR - START_HOUR }).map((_, index) => (
                                <div key={index} className="tl-hour-cell">
                                    {String((START_HOUR + index) % 24).padStart(2, '0')}:00
                                </div>
                            ))}
                        </div>
                    </div>

                    {rooms.map((room) => (
                        <div key={room.id} className="tl-room-row">
                            <div className="tl-room-info">
                                <div className="tl-room-name">{room.name}</div>
                                <div className="tl-room-cap">
                                    {room.seatCount || (room.totalRows * room.totalColumns) || 0} ghế
                                </div>
                            </div>
                            <div
                                className="tl-track"
                                onClick={(event) => handleTrackClick(event, room.id)}
                                title="Click để tạo suất chiếu"
                            >
                                {todaysShowtimes
                                    .filter((showtime) => showtime.roomId === room.id)
                                    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                                    .map((showtime) => {
                                        const meta = getTimelineCardMeta(showtime, date);
                                        const isPreview = showtime.status === 'PREVIEW';
                                        const isPast = new Date(showtime.endTime).getTime() < Date.now();
                                        const showtimeKey = showtime.id ?? `preview-${showtime.roomId}-${showtime.movieId}-${showtime.startTime}`;

                                        return (
                                            <div
                                                key={showtimeKey}
                                                className={`show-card c-${showtime.movieId % 5} ${isPreview ? 'is-preview' : ''} ${isPast ? 'is-past' : ''} ${meta.isCompact ? 'is-compact' : ''} ${meta.isTiny ? 'is-tiny' : ''} ${meta.startsBeforeDay ? 'is-continued-left' : ''} ${meta.endsAfterDay ? 'is-continued-right' : ''} ${meta.needsReadableBoost ? 'is-readable-boost' : ''}`}
                                                style={meta.style}
                                                title={`${isPreview ? '[Xem trước] ' : ''}${showtime.movieTitle}\n${showtime.startTime.split('T')[1].slice(0, 5)} - ${showtime.endTime.split('T')[1].slice(0, 5)}`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openEditModal(showtime);
                                                }}
                                            >
                                                {isPreview && <div className="show-card-badge">Preview</div>}
                                                <div className="show-card-title">{showtime.movieTitle}</div>
                                                <div className="show-card-time">
                                                    {showtime.startTime.split('T')[1].slice(0, 5)} - {showtime.endTime.split('T')[1].slice(0, 5)}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderCalendar = () => {
        const days = generateCalendarGrid(date);

        return (
            <div className="calendar-wrapper">
                <div className="cal-container">
                    <div className="cal-header">
                        {['CN', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'].map((day) => (
                            <div key={day} className="cal-weekday">{day}</div>
                        ))}
                    </div>
                    <div className="cal-grid">
                        {days.map((day, index) => {
                            const dayKey = formatDateKey(day);
                            const isCurrentMonth = day.getMonth() === date.getMonth();
                            const isToday = formatDateKey(new Date()) === dayKey;
                            const count = displayedShowtimes.filter((showtime) => overlapsDay(showtime, day)).length;

                            return (
                                <div
                                    key={index}
                                    className={`cal-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                                    onClick={() => {
                                        setDate(day);
                                        setView('timeline');
                                    }}
                                >
                                    <div className="day-num">{day.getDate()}</div>
                                    {count > 0 && (
                                        <div className="day-dots">
                                            {Array.from({ length: Math.min(count, 5) }).map((_, dotIndex) => (
                                                <div key={dotIndex} className="dot" />
                                            ))}
                                            {count > 5 && <span className="more-tag">+{count - 5}</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="app-container">
            <div className="app-header">
                <div className="header-left">
                    <div className="app-title">Lịch Chiếu Phim</div>
                    <div className="view-toggles">
                        <button className={`toggle-btn ${view === 'timeline' ? 'active' : ''}`} onClick={() => setView('timeline')}>Timeline</button>
                        <button className={`toggle-btn ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}>Lịch Tháng</button>
                    </div>
                </div>

                <div className="date-controls">
                    <button className="nav-btn" onClick={() => handleNav(-1)}>‹</button>
                    <div className="current-date">
                        {view === 'timeline'
                            ? date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
                            : `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`}
                    </div>
                    <button className="nav-btn" onClick={() => handleNav(1)}>›</button>
                </div>

                <div className="header-actions">
                    <button className="btn-secondary" onClick={openAutoModal}>Tạo Tự Động</button>
                    <button className="btn-danger-soft" onClick={openCleanupModal}>Dọn dẹp lịch</button>
                    <button className="btn-create" onClick={() => openCreateModal()}>+ Tạo Mới</button>
                </div>
            </div>

            {previewRequest && (
                <div className="preview-banner">
                    <div className="preview-banner-copy">
                        <strong>Chế độ xem trước đang bật</strong>
                        <span>{previewMessage || 'Kiểm tra timeline, nếu ổn hãy lưu xuống database.'}</span>
                    </div>
                    <div className="preview-banner-actions">
                        <button type="button" className="btn-outline" onClick={clearPreview} disabled={savingPreview}>
                            Hủy xem trước
                        </button>
                        <button type="button" className="btn-create preview-save-button" onClick={handleSavePreview} disabled={savingPreview}>
                            {savingPreview && <span className="button-spinner" aria-hidden="true" />}
                            {savingPreview ? 'Đang lưu...' : 'Lưu xuống Database'}
                        </button>
                    </div>
                </div>
            )}

            {loading ? <div className="empty-state">Đang tải dữ liệu lịch chiếu...</div> : view === 'timeline' ? renderTimeline() : renderCalendar()}

            {modal?.type === 'cleanup' && (
                <div className="showtime-modal-backdrop" onClick={() => setModal(null)}>
                    <div className="modal-panel create-modal cleanup-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="create-modal-header">
                            <div className="create-modal-header-icon">🧹</div>
                            <div>
                                <h3>Dọn dẹp lịch</h3>
                                <p className="create-modal-subtitle">Xóa lịch chiếu theo tiêu chí trong ngày đang chọn</p>
                            </div>
                            <button className="create-modal-close" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <div className="create-modal-body">
                            <form onSubmit={handleCleanupSubmit}>
                                <div className="create-form-group">
                                    <label className="create-form-label">Ngày áp dụng</label>
                                    <input type="date" className="create-form-input" value={selectedScheduleDate} disabled />
                                </div>

                                <label className="cleanup-all-toggle">
                                    <input
                                        type="checkbox"
                                        checked={cleanupForm.deleteAll}
                                        onChange={(event) => {
                                            const checked = event.target.checked;
                                            setCleanupForm((prev) => ({
                                                ...prev,
                                                deleteAll: checked,
                                                roomIds: checked ? [] : prev.roomIds,
                                                movieIds: checked ? [] : prev.movieIds,
                                            }));
                                        }}
                                    />
                                    <span>Xóa tất cả suất chiếu trong ngày</span>
                                </label>

                                <div className="create-form-group">
                                    <label className="create-form-label">Tích chọn phòng</label>
                                    <div className={`cleanup-selection-grid ${cleanupForm.deleteAll ? 'is-disabled' : ''}`}>
                                        {rooms.map((room) => (
                                            <label key={room.id} className="selection-card">
                                                <input
                                                    type="checkbox"
                                                    checked={cleanupForm.roomIds.includes(room.id)}
                                                    onChange={() => toggleCleanupSelection('roomIds', room.id)}
                                                    disabled={cleanupForm.deleteAll}
                                                />
                                                <span>{room.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="create-form-group">
                                    <label className="create-form-label">Tích chọn phim</label>
                                    <div className={`cleanup-selection-grid ${cleanupForm.deleteAll ? 'is-disabled' : ''}`}>
                                        {activeMovies.map((movie) => (
                                            <label key={movie.id} className="selection-card">
                                                <input
                                                    type="checkbox"
                                                    checked={cleanupForm.movieIds.includes(movie.id)}
                                                    onChange={() => toggleCleanupSelection('movieIds', movie.id)}
                                                    disabled={cleanupForm.deleteAll}
                                                />
                                                <span>{movie.title}</span>
                                            </label>
                                        ))}
                                        {!activeMovies.length && (
                                            <div className="info-note cleanup-info-note">Không có phim khả dụng để chọn.</div>
                                        )}
                                    </div>
                                </div>

                                <div className="info-note">
                                    Sẽ xóa <strong>{cleanupTargetShowtimes.length}</strong> suất chiếu trong ngày {selectedScheduleDate}.
                                </div>

                                <div className="modal-action-row">
                                    <button
                                        type="submit"
                                        className="btn-danger cleanup-submit"
                                        disabled={cleanupDeleting || !cleanupTargetShowtimes.length || (!cleanupForm.deleteAll && !hasCleanupCriteria)}
                                    >
                                        {cleanupDeleting && <span className="button-spinner" aria-hidden="true" />}
                                        {cleanupDeleting ? 'Đang xoá...' : 'Xác nhận xoá'}
                                    </button>
                                    <button type="button" className="btn-outline" onClick={() => setModal(null)} disabled={cleanupDeleting}>
                                        Hủy
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {modal?.type === 'create' && (
                <div className="showtime-modal-backdrop" onClick={() => setModal(null)}>
                    <div className="modal-panel create-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="create-modal-header">
                            <div className="create-modal-header-icon">🎬</div>
                            <div>
                                <h3>
                                    {createForm.isPreview
                                        ? (createForm.previewKey ? 'Chỉnh Sửa Suất Chiếu Xem Trước' : 'Thêm Suất Chiếu Xem Trước')
                                        : (createForm.id ? 'Cập Nhật Suất Chiếu' : 'Thêm Suất Chiếu Mới')}
                                </h3>
                                <p className="create-modal-subtitle">
                                    {createForm.isPreview
                                        ? 'Các thay đổi chỉ áp dụng cho bản xem trước, chưa lưu xuống database'
                                        : 'Tăng tốc thao tác admin với tạo, sửa, xóa ngay trên timeline'}
                                </p>
                            </div>
                            <button className="create-modal-close" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <div className="create-modal-body">
                            <form onSubmit={handleCreateSubmit}>
                                <div className="create-section-label">Thông tin phim</div>
                                <div className="create-form-group">
                                    <label className="create-form-label">Chọn Phim</label>
                                    <select
                                        className="create-form-select"
                                        value={createForm.movieId}
                                        onChange={(event) => setCreateForm({ ...createForm, movieId: event.target.value })}
                                        required
                                    >
                                        <option value="">-- Chọn phim --</option>
                                        {createAvailableMovies.map((movie) => (
                                            <option key={movie.id} value={movie.id}>{movie.title}</option>
                                        ))}
                                    </select>
                                    {!createAvailableMovies.length && (
                                        <div className="info-note">
                                            Không có phim nào phù hợp với ngày đã chọn.
                                        </div>
                                    )}
                                </div>
                                <div className="create-form-group">
                                    <label className="create-form-label">Phòng Chiếu</label>
                                    <select
                                        className="create-form-select"
                                        value={createForm.roomId}
                                        onChange={(event) => setCreateForm({ ...createForm, roomId: event.target.value })}
                                        required
                                    >
                                        <option value="">-- Chọn phòng --</option>
                                        {rooms.map((room) => (
                                            <option key={room.id} value={room.id}>{room.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="create-form-divider"></div>
                                <div className="create-section-label">Thời gian chiếu</div>

                                <div className="create-form-row">
                                    <div className="create-form-group">
                                        <label className="create-form-label">Ngày Chiếu</label>
                                        <input
                                            type="date"
                                            className="create-form-input"
                                            value={createForm.date}
                                            onChange={(event) => setCreateForm({ ...createForm, date: event.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="create-form-group">
                                        <label className="create-form-label">Giờ Bắt Đầu</label>
                                        <input
                                            type="time"
                                            step="900"
                                            className="create-form-input"
                                            value={createForm.startTime}
                                            onChange={(event) => setCreateForm({ ...createForm, startTime: event.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="info-note">
                                    Hệ thống sẽ tự động đảm bảo phòng không trùng lịch, có 15 phút dọn dẹp và không để 1 phòng chiếu cùng phim liên tiếp.
                                </div>

                                <div className="modal-action-row">
                                    <button type="submit" className="create-form-submit">
                                        {createForm.isPreview
                                            ? (createForm.previewKey ? 'Cập Nhật Bản Xem Trước' : 'Thêm Vào Bản Xem Trước')
                                            : (createForm.id ? 'Lưu Thay Đổi' : 'Tạo Lịch Chiếu')}
                                    </button>
                                    {(createForm.id || createForm.isPreview) && (
                                        <>
                                            {createForm.id && !createForm.isPreview && (
                                                <button type="button" className="btn-outline" onClick={() => openSeatModal({ id: createForm.id })}>
                                                    Xem Ghế
                                                </button>
                                            )}
                                            <button type="button" className="btn-danger" onClick={handleDeleteShowtime}>
                                                {createForm.isPreview ? 'Loại Khỏi Xem Trước' : 'Xóa'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {modal?.type === 'auto' && (
                <div className="showtime-modal-backdrop" onClick={() => setModal(null)}>
                    <div className="modal-panel create-modal auto-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="create-modal-header">
                            <div className="create-modal-header-icon">⚙</div>
                            <div>
                                <h3>Xem Trước Lịch Tự Động</h3>
                                <p className="create-modal-subtitle">Tạo một phương án sắp lịch trước, admin duyệt xong mới lưu xuống database</p>
                            </div>
                            <button className="create-modal-close" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <div className="create-modal-body">
                            <form onSubmit={handleAutoSubmit}>
                                <div className="create-form-row">
                                    <div className="create-form-group">
                                        <label className="create-form-label">Ngày Áp Dụng</label>
                                        <input
                                            type="date"
                                            className="create-form-input"
                                            value={autoForm.scheduleDate}
                                            onChange={(event) => setAutoForm({ ...autoForm, scheduleDate: event.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="create-form-group">
                                        <label className="create-form-label">Mở Cửa</label>
                                        <input
                                            type="time"
                                            className="create-form-input"
                                            value={autoForm.openingTime}
                                            onChange={(event) => setAutoForm({ ...autoForm, openingTime: event.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="create-form-group">
                                        <label className="create-form-label">Đóng Cửa</label>
                                        <input
                                            type="time"
                                            className="create-form-input"
                                            value={autoForm.closingTime}
                                            onChange={(event) => setAutoForm({ ...autoForm, closingTime: event.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="create-form-divider"></div>
                                <div className="create-section-label">Chọn Phim</div>
                                <div className="selection-grid">
                                    {autoAvailableMovies.map((movie) => (
                                        <label key={movie.id} className="selection-card">
                                            <input
                                                type="checkbox"
                                                checked={autoForm.movieIds.includes(movie.id)}
                                                onChange={() => toggleSelection('movieIds', movie.id)}
                                            />
                                            <span>{movie.title}</span>
                                        </label>
                                    ))}
                                </div>
                                {!autoAvailableMovies.length && (
                                    <div className="info-note">
                                        Không có phim nào phù hợp với ngày đã chọn.
                                    </div>
                                )}

                                <div className="create-form-divider"></div>
                                <div className="create-section-label">Chọn Phòng</div>
                                <div className="selection-grid">
                                    {rooms.map((room) => (
                                        <label key={room.id} className="selection-card">
                                            <input
                                                type="checkbox"
                                                checked={autoForm.roomIds.includes(room.id)}
                                                onChange={() => toggleSelection('roomIds', room.id)}
                                            />
                                            <span>{room.name}</span>
                                        </label>
                                    ))}
                                </div>

                                <div className="info-note">
                                    Hệ thống sẽ tạo bản xem trước trên timeline, giữ nguyên các suất đã có và chỉ chèn thêm suất mới vào khoảng trống phù hợp. Khi admin bấm lưu, dữ liệu mới được ghi xuống database.
                                </div>

                                <button type="submit" className="create-form-submit" disabled={!autoForm.movieIds.length || !autoForm.roomIds.length}>
                                    Xem Trước Lịch
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {modal?.type === 'seat' && selectedSeats && (
                <div className="showtime-modal-backdrop" onClick={() => setModal(null)}>
                    <div className="modal-panel seat-modal-panel" onClick={(event) => event.stopPropagation()}>
                        <div className="modal-head">
                            <h3>{selectedSeats.movieTitle}</h3>
                            <button className="nav-btn" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <div className="modal-content seat-modal-content">
                            <SeatGrid seats={selectedSeats.seats} totalColumns={roomCols} showPrice />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShowtimeManager;
