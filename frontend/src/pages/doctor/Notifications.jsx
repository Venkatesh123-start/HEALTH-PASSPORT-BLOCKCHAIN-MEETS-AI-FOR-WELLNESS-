import React, { useEffect, useState } from "react";
import "./Notifications.css";

const Notifications = ({ token, doctorId, countOnly }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/doctor/${doctorId}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setNotifications(data.data || []);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [token, doctorId]);

  if (loading) return <div className="loading">Loading notifications...</div>;
  if (countOnly) return <span>{notifications.length}</span>;
  if (notifications.length === 0) return <div className="no-data">No notifications.</div>;

  return (
    <div className="notifications">
      <h2>Notifications</h2>
      <ul>
        {notifications.map((notif) => (
          <li key={notif._id} className={notif.type}>
            <span className="notif-date">{new Date(notif.date).toLocaleString()}</span>
            <span className="notif-message">{notif.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Notifications;