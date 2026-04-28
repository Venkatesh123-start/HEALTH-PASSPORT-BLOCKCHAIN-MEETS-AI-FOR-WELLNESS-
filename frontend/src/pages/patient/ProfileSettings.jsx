import React, { useState } from "react";
import "./ProfileSettings.css";

const ProfileSettings = ({ token, patientId }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const updateProfile = async (e) => {
    e.preventDefault();
    await fetch(`http://localhost:5000/api/patient/update/${patientId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    alert("Profile Updated");
  };

  return (
    <form className="profile-form" onSubmit={updateProfile}>
      <h2>Profile Settings</h2>
      <input name="name" placeholder="Name" onChange={handleChange} />
      <input name="email" placeholder="Email" onChange={handleChange} />
      <input name="phone" placeholder="Phone" onChange={handleChange} />
      <button type="submit">Update</button>
    </form>
  );
};

export default ProfileSettings;
