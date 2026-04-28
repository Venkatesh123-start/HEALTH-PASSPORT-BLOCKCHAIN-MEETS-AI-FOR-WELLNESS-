import React, { useEffect, useState, useCallback } from "react";
import "./Notifications.css";

const Notifications = ({ token, patientId, countOnly }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `http://localhost:5000/api/notifications/patient/${patientId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
      } else {
        setError(data.message || "Failed to load notifications");
      }
    } catch (err) {
      setError("Network error while loading notifications");
    } finally {
      setLoading(false);
    }
  }, [token, patientId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  if (countOnly) {
    const unreadCount = notifications.filter((n) => !n.read).length;
    return <span>{unreadCount}</span>;
  }

  if (loading) {
    return <div className="notifications-loading">Loading notifications...</div>;
  }

  return (
    <div className="notifications">
      <h2>Notifications</h2>
      {error && <div className="notifications-error">{error}</div>}
      {notifications.length === 0 ? (
        <div className="notifications-empty">No notifications</div>
      ) : (
        <ul>
          {notifications.map((n) => (
            <li key={n._id} className={n.read ? "read" : "unread"}>
              <div className="notif-title">{n.title || "Notification"}</div>
              <div className="notif-message">{n.message}</div>
              <div className="notif-date">
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
