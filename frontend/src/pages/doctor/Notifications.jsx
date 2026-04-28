import React, { useEffect, useState, useCallback } from "react";
import "./Notifications.css";

const Notifications = ({ token, doctorId, countOnly }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`http://localhost:5000/api/doctor/${doctorId}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
  }, [token, doctorId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  if (loading) return <div className="loading">Loading notifications...</div>;
  if (countOnly) {
    const unreadCount = notifications.filter((n) => !n.read).length;
    return <span>{unreadCount}</span>;
  }
  if (notifications.length === 0) return <div className="no-data">No notifications.</div>;

  return (
    <div className="notifications">
      <h2>Notifications</h2>
      {error && <div className="notifications-error">{error}</div>}
      <ul>
        {notifications.map((notif) => (
          <li key={notif._id} className={notif.type}>
            <span className="notif-date">
              {new Date(notif.createdAt || notif.date).toLocaleString()}
            </span>
            <span className="notif-message">{notif.title || notif.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Notifications;
