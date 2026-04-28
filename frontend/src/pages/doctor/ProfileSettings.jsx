import React, { useEffect, useState } from "react";
import "./ProfileSettings.css";

const ProfileSettings = ({ token, doctorId }) => {
  const [doctor, setDoctor] = useState({
    name: "",
    email: "",
    specialty: "",
    phone: "",
    availability: "",
  });
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/doctor/${doctorId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.data) setDoctor(data.data);
      } catch (err) {
        console.error("Failed to fetch doctor data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctor();
  }, [token, doctorId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDoctor((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch(`http://localhost:5000/api/doctor/${doctorId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(doctor),
      });
      const data = await res.json();
      setMessage(data.message || "Profile updated successfully!");
    } catch (err) {
      console.error(err);
      setMessage("Failed to update profile.");
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    setMessage("");
    if (passwords.new !== passwords.confirm) {
      setMessage("New passwords do not match.");
      return;
    }
    try {
      const res = await fetch(`http://localhost:5000/api/doctor/${doctorId}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passwords),
      });
      const data = await res.json();
      setMessage(data.message || "Password updated successfully!");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err) {
      console.error(err);
      setMessage("Failed to update password.");
    }
  };

  if (loading) return <div className="loading">Loading profile...</div>;

  return (
    <div className="profile-settings">
      <h2>Profile Settings</h2>
      {message && <div className="message">{message}</div>}

      {/* Personal Info */}
      <form className="profile-form" onSubmit={updateProfile}>
        <h3>Personal Info</h3>
        <label>Name</label>
        <input name="name" value={doctor.name} onChange={handleInputChange} required />
        <label>Email</label>
        <input name="email" value={doctor.email} onChange={handleInputChange} type="email" required />
        <label>Specialty</label>
        <input name="specialty" value={doctor.specialty} onChange={handleInputChange} />
        <label>Phone</label>
        <input name="phone" value={doctor.phone} onChange={handleInputChange} />
        <label>Availability</label>
        <input name="availability" value={doctor.availability} onChange={handleInputChange} placeholder="E.g., Mon-Fri 9am-5pm" />
        <button type="submit">Update Profile</button>
      </form>

      {/* Change Password */}
      <form className="profile-form" onSubmit={updatePassword}>
        <h3>Change Password</h3>
        <label>Current Password</label>
        <input type="password" name="current" value={passwords.current} onChange={handlePasswordChange} required />
        <label>New Password</label>
        <input type="password" name="new" value={passwords.new} onChange={handlePasswordChange} required />
        <label>Confirm New Password</label>
        <input type="password" name="confirm" value={passwords.confirm} onChange={handlePasswordChange} required />
        <button type="submit">Change Password</button>
      </form>
    </div>
  );
};

export default ProfileSettings;
