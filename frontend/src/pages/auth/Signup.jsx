import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Signup.css";

const Signup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("patient");

  const [formData, setFormData] = useState({
    name: "",
    mail: "",
    password: "",
    license: "",
    speciality: "",
    labName: "",
    companyName: "",
    phone: "",
    address: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const register = async () => {
    try {
      setLoading(true);

      if (!formData.name || !formData.mail || !formData.password) {
        alert("⚠ Please fill all required fields");
        setLoading(false);
        return;
      }

      // Validate role-specific fields
      if (role === "doctor" && (!formData.license || !formData.speciality)) {
        alert("⚠ Please complete doctor details");
        setLoading(false);
        return;
      }

      if (role === "lab" && (!formData.labName || !formData.license)) {
        alert("⚠ Please complete laboratory details");
        setLoading(false);
        return;
      }

      if (role === "insurance" && (!formData.companyName || !formData.license)) {
        alert("⚠ Please complete insurance details");
        setLoading(false);
        return;
      }

      // Build endpoint and payload based on role
      let endpoint = "";
      let payload = {
        name: formData.name,
        email: formData.mail,
        password: formData.password,
      };

      if (role === "patient") {
        endpoint = "http://localhost:5000/api/patients/register";
      } else if (role === "doctor") {
        endpoint = "http://localhost:5000/api/doctors/register";
        payload.license = formData.license;
        payload.speciality = formData.speciality;
      } else if (role === "lab") {
        endpoint = "http://localhost:5000/api/labs/register";
        payload.labName = formData.labName;
        payload.licenseNumber = formData.license;
        payload.phone = formData.phone;
        payload.address = formData.address;
      } else if (role === "insurance") {
        endpoint = "http://localhost:5000/api/insurance/register";
        payload.companyName = formData.companyName;
        payload.licenseNumber = formData.license;
        payload.phone = formData.phone;
        payload.address = formData.address;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        alert("✅ Account Created Successfully!");
        navigate("/login");
      } else {
        alert("❌ " + (result.message || "Failed to create account"));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Signup Failed. Check Backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h2>Create MediVault Account</h2>
        <p className="subtitle">Secure blockchain-based medical records</p>

        {/* Role Selection */}
        <div className="input-group">
          <label>Register As</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="role-select"
          >
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="lab">Laboratory</option>
            <option value="insurance">Insurance Provider</option>
          </select>
        </div>

        <div className="input-group">
          <label>Full Name</label>
          <input
            type="text"
            name="name"
            placeholder="Enter full name"
            onChange={handleChange}
          />
        </div>

        <div className="input-group">
          <label>Email Address</label>
          <input
            type="email"
            name="mail"
            placeholder="youremail@example.com"
            onChange={handleChange}
          />
        </div>

        {/* Doctor-specific fields */}
        {role === "doctor" && (
          <>
            <div className="input-group">
              <label>Specialization</label>
              <input
                type="text"
                name="speciality"
                placeholder="Cardiologist / Neurologist"
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label>License Number</label>
              <input
                type="text"
                name="license"
                placeholder="Medical License ID"
                onChange={handleChange}
              />
            </div>
          </>
        )}

        {/* Lab-specific fields */}
        {role === "lab" && (
          <>
            <div className="input-group">
              <label>Laboratory Name</label>
              <input
                type="text"
                name="labName"
                placeholder="Lab/Facility Name"
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label>License Number</label>
              <input
                type="text"
                name="license"
                placeholder="Lab License ID"
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label>Phone</label>
              <input
                type="text"
                name="phone"
                placeholder="Contact Number"
                onChange={handleChange}
              />
            </div>
          </>
        )}

        {/* Insurance-specific fields */}
        {role === "insurance" && (
          <>
            <div className="input-group">
              <label>Company Name</label>
              <input
                type="text"
                name="companyName"
                placeholder="Insurance Company Name"
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label>License Number</label>
              <input
                type="text"
                name="license"
                placeholder="Insurance License ID"
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label>Phone</label>
              <input
                type="text"
                name="phone"
                placeholder="Contact Number"
                onChange={handleChange}
              />
            </div>
          </>
        )}

        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Create strong password"
            onChange={handleChange}
          />
        </div>

        <button className="signup-btn" onClick={register} disabled={loading}>
          {loading ? "Creating Account..." : "Sign Up"}
        </button>

        <p className="redirect">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;