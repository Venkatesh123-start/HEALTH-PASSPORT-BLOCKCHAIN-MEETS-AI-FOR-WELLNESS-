import React, { useState } from "react";
import "./VitalsEntry.css";

const VitalsEntry = ({ token, patientId, onSuccess }) => {
  const [formData, setFormData] = useState({
    temperature: "",
    heartRate: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    respiratoryRate: "",
    oxygenLevel: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  // Validation rules
  const validationRules = {
    temperature: { min: 95, max: 105, unit: "°F" },
    heartRate: { min: 40, max: 200, unit: "bpm" },
    bloodPressureSystolic: { min: 70, max: 200, unit: "mmHg" },
    bloodPressureDiastolic: { min: 40, max: 130, unit: "mmHg" },
    respiratoryRate: { min: 8, max: 40, unit: "breaths/min" },
    oxygenLevel: { min: 70, max: 100, unit: "%" },
  };

  const fieldLabels = {
    temperature: "Temperature",
    heartRate: "Heart Rate",
    bloodPressureSystolic: "Blood Pressure (Systolic)",
    bloodPressureDiastolic: "Blood Pressure (Diastolic)",
    respiratoryRate: "Respiratory Rate",
    oxygenLevel: "Oxygen Level (SpO2)",
  };

  const validateField = (name, value) => {
    if (!value || value === "") return null; // Empty is valid (optional field)

    const rule = validationRules[name];
    if (!rule) return null;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return `${fieldLabels[name]} must be a number`;
    }
    if (numValue < rule.min || numValue > rule.max) {
      return `${fieldLabels[name]} must be between ${rule.min} and ${rule.max} ${rule.unit}`;
    }
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Real-time validation
    const error = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));

    // Clear success message on edit
    if (success) setSuccess(null);
  };

  const validateAll = () => {
    const newErrors = {};
    let hasValue = false;

    Object.keys(validationRules).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
      if (formData[field] && formData[field] !== "") hasValue = true;
    });

    if (!hasValue) {
      newErrors.general = "Please enter at least one vital sign";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateAll()) return;

    setSubmitting(true);
    setSuccess(null);

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}`/api/vitals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId,
          temperature: formData.temperature || null,
          heartRate: formData.heartRate || null,
          bloodPressureSystolic: formData.bloodPressureSystolic || null,
          bloodPressureDiastolic: formData.bloodPressureDiastolic || null,
          respiratoryRate: formData.respiratoryRate || null,
          oxygenLevel: formData.oxygenLevel || null,
          notes: formData.notes || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Vitals recorded successfully!");
        setFormData({
          temperature: "",
          heartRate: "",
          bloodPressureSystolic: "",
          bloodPressureDiastolic: "",
          respiratoryRate: "",
          oxygenLevel: "",
          notes: "",
        });
        setErrors({});
        if (onSuccess) onSuccess(data.data);
      } else {
        setErrors({
          general: data.message || "Failed to record vitals",
          ...(data.errors ? { validation: data.errors } : {}),
        });
      }
    } catch (error) {
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="vitals-entry">
      <h2>📊 Record Your Vitals</h2>
      <p className="subtitle">Enter your current vital signs. All data is encrypted before storage.</p>

      {success && <div className="success-message">{success}</div>}
      {errors.general && <div className="error-message">{errors.general}</div>}
      {errors.validation && (
        <div className="error-message">
          <ul>
            {errors.validation.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="vitals-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="temperature">
              🌡️ Temperature ({validationRules.temperature.min}-{validationRules.temperature.max} °F)
            </label>
            <input
              type="number"
              id="temperature"
              name="temperature"
              value={formData.temperature}
              onChange={handleChange}
              placeholder="e.g., 98.6"
              step="0.1"
              min={validationRules.temperature.min}
              max={validationRules.temperature.max}
              className={errors.temperature ? "error" : ""}
            />
            {errors.temperature && <span className="field-error">{errors.temperature}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="heartRate">
              ❤️ Heart Rate ({validationRules.heartRate.min}-{validationRules.heartRate.max} bpm)
            </label>
            <input
              type="number"
              id="heartRate"
              name="heartRate"
              value={formData.heartRate}
              onChange={handleChange}
              placeholder="e.g., 72"
              min={validationRules.heartRate.min}
              max={validationRules.heartRate.max}
              className={errors.heartRate ? "error" : ""}
            />
            {errors.heartRate && <span className="field-error">{errors.heartRate}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="bloodPressureSystolic">
              🩺 Systolic BP ({validationRules.bloodPressureSystolic.min}-{validationRules.bloodPressureSystolic.max} mmHg)
            </label>
            <input
              type="number"
              id="bloodPressureSystolic"
              name="bloodPressureSystolic"
              value={formData.bloodPressureSystolic}
              onChange={handleChange}
              placeholder="e.g., 120"
              min={validationRules.bloodPressureSystolic.min}
              max={validationRules.bloodPressureSystolic.max}
              className={errors.bloodPressureSystolic ? "error" : ""}
            />
            {errors.bloodPressureSystolic && <span className="field-error">{errors.bloodPressureSystolic}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="bloodPressureDiastolic">
              🩺 Diastolic BP ({validationRules.bloodPressureDiastolic.min}-{validationRules.bloodPressureDiastolic.max} mmHg)
            </label>
            <input
              type="number"
              id="bloodPressureDiastolic"
              name="bloodPressureDiastolic"
              value={formData.bloodPressureDiastolic}
              onChange={handleChange}
              placeholder="e.g., 80"
              min={validationRules.bloodPressureDiastolic.min}
              max={validationRules.bloodPressureDiastolic.max}
              className={errors.bloodPressureDiastolic ? "error" : ""}
            />
            {errors.bloodPressureDiastolic && <span className="field-error">{errors.bloodPressureDiastolic}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="respiratoryRate">
              💨 Respiratory Rate ({validationRules.respiratoryRate.min}-{validationRules.respiratoryRate.max} breaths/min)
            </label>
            <input
              type="number"
              id="respiratoryRate"
              name="respiratoryRate"
              value={formData.respiratoryRate}
              onChange={handleChange}
              placeholder="e.g., 16"
              min={validationRules.respiratoryRate.min}
              max={validationRules.respiratoryRate.max}
              className={errors.respiratoryRate ? "error" : ""}
            />
            {errors.respiratoryRate && <span className="field-error">{errors.respiratoryRate}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="oxygenLevel">
              🫁 Oxygen Level ({validationRules.oxygenLevel.min}-{validationRules.oxygenLevel.max}%)
            </label>
            <input
              type="number"
              id="oxygenLevel"
              name="oxygenLevel"
              value={formData.oxygenLevel}
              onChange={handleChange}
              placeholder="e.g., 98"
              step="0.1"
              min={validationRules.oxygenLevel.min}
              max={validationRules.oxygenLevel.max}
              className={errors.oxygenLevel ? "error" : ""}
            />
            {errors.oxygenLevel && <span className="field-error">{errors.oxygenLevel}</span>}
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="notes">📝 Notes (optional)</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any additional observations or symptoms..."
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? "Recording..." : "🔒 Record Vitals (Encrypted)"}
          </button>
        </div>

        <p className="encryption-note">
          🔐 Your vital signs are encrypted using AES-256 before being stored in our secure database.
        </p>
      </form>
    </div>
  );
};

export default VitalsEntry;
