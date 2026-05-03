import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "patient", // Default role
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const login = async () => {
    try {
      setLoading(true);

      if (!formData.email || !formData.password) {
        alert("⚠ Please enter email and password");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}`/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        // Store token and user
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.user));
        localStorage.setItem("role", result.user.role);

        alert("✅ Login Successful!");

        const role = result.user.role?.toLowerCase();

        // Role-based redirect
        if (role === "doctor") {
          navigate("/doctor/dashboard");
        } else if (role === "patient") {
          navigate("/patient/dashboard");
        } else if (role === "lab") {
          navigate("/lab/dashboard");
        } else if (role === "insurance") {
          navigate("/insurance/dashboard");
        } else {
          navigate("/");
        }
      } else {
        alert("❌ " + (result.message || "Invalid credentials"));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Login Failed. Check Backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Welcome Back</h2>
        <p className="subtitle">Login to your MediVault account</p>

        <div className="input-group">
          <label>Login As</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="role-select"
          >
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="lab">Laboratory</option>
            <option value="insurance">Insurance Provider</option>
          </select>
        </div>

        <div className="input-group">
          <label>Email Address</label>
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            onChange={handleChange}
          />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            onChange={handleChange}
          />
        </div>

        <button className="login-btn" onClick={login} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="redirect">
          Don’t have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
