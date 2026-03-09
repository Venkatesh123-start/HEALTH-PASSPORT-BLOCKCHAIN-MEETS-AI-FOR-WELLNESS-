import React, { useEffect, useState } from "react";
import "./Notifications.css";

const Notifications = ({ token, patientId, countOnly }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const res = await fetch(
      `http://localhost:5000/api/notifications/patient/${patientId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    setNotifications(data.data || []);
  };

  if (countOnly) return notifications.length;

  return (
    <div>
      <h2>Notifications</h2>
      <ul>
        {notifications.map((n) => (
          <li key={n._id}>{n.message}</li>
        ))}
      </ul>
    </div>
  );
};

export default Notifications;