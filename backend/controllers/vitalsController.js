// controllers/vitalsController.js
const Vitals = require("../models/Vitals");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const CryptoJS = require("crypto-js");

// Encryption helpers
const generateIV = () => {
  return CryptoJS.lib.WordArray.random(16).toString();
};

const encryptVitals = (data, iv) => {
  const key = CryptoJS.enc.Utf8.parse(process.env.ENCRYPTION_SECRET.padEnd(32, '0').slice(0, 32));
  const ivParsed = CryptoJS.enc.Hex.parse(iv);
  
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, {
    iv: ivParsed,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  
  return encrypted.toString();
};

const decryptVitals = (encryptedData, iv) => {
  try {
    const key = CryptoJS.enc.Utf8.parse(process.env.ENCRYPTION_SECRET.padEnd(32, '0').slice(0, 32));
    const ivParsed = CryptoJS.enc.Hex.parse(iv);
    
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
      iv: ivParsed,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    console.error("Decryption failed:", error.message);
    return null;
  }
};

// Validation helpers
const validateVitals = (vitals) => {
  const errors = [];

  // Temperature (Fahrenheit): 95-105°F
  if (vitals.temperature !== undefined && vitals.temperature !== null) {
    const temp = parseFloat(vitals.temperature);
    if (isNaN(temp) || temp < 95 || temp > 105) {
      errors.push("Temperature must be between 95°F and 105°F");
    }
  }

  // Heart Rate: 40-200 bpm
  if (vitals.heartRate !== undefined && vitals.heartRate !== null) {
    const hr = parseInt(vitals.heartRate);
    if (isNaN(hr) || hr < 40 || hr > 200) {
      errors.push("Heart rate must be between 40 and 200 bpm");
    }
  }

  // Blood Pressure Systolic: 70-200 mmHg
  if (vitals.bloodPressureSystolic !== undefined && vitals.bloodPressureSystolic !== null) {
    const sys = parseInt(vitals.bloodPressureSystolic);
    if (isNaN(sys) || sys < 70 || sys > 200) {
      errors.push("Systolic blood pressure must be between 70 and 200 mmHg");
    }
  }

  // Blood Pressure Diastolic: 40-130 mmHg
  if (vitals.bloodPressureDiastolic !== undefined && vitals.bloodPressureDiastolic !== null) {
    const dia = parseInt(vitals.bloodPressureDiastolic);
    if (isNaN(dia) || dia < 40 || dia > 130) {
      errors.push("Diastolic blood pressure must be between 40 and 130 mmHg");
    }
  }

  // Respiratory Rate: 8-40 breaths/min
  if (vitals.respiratoryRate !== undefined && vitals.respiratoryRate !== null) {
    const rr = parseInt(vitals.respiratoryRate);
    if (isNaN(rr) || rr < 8 || rr > 40) {
      errors.push("Respiratory rate must be between 8 and 40 breaths/min");
    }
  }

  // Oxygen Level (SpO2): 70-100%
  if (vitals.oxygenLevel !== undefined && vitals.oxygenLevel !== null) {
    const o2 = parseFloat(vitals.oxygenLevel);
    if (isNaN(o2) || o2 < 70 || o2 > 100) {
      errors.push("Oxygen level must be between 70% and 100%");
    }
  }

  return errors;
};

/**
 * @desc    Record new vitals
 * @route   POST /api/vitals
 * @access  Private (Patient or Doctor)
 */
const recordVitals = async (req, res, next) => {
  try {
    const {
      patientId,
      temperature,
      heartRate,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      respiratoryRate,
      oxygenLevel,
      notes,
    } = req.body;

    // Determine target patient
    let targetPatientId = patientId;
    
    // If patient is recording their own vitals
    if (req.user.role === "patient") {
      // Patients can only record their own vitals
      const patient = await Patient.findOne({ email: req.user.email });
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient profile not found",
        });
      }
      targetPatientId = patient._id;
    } else if (req.user.role === "doctor") {
      // Doctors must specify patient ID
      if (!patientId) {
        return res.status(400).json({
          success: false,
          message: "Patient ID is required for doctor recording",
        });
      }
      // Verify patient exists
      const patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
        });
      }
    }

    // Build vitals object
    const vitalsData = {
      temperature: temperature ? parseFloat(temperature) : null,
      heartRate: heartRate ? parseInt(heartRate) : null,
      bloodPressureSystolic: bloodPressureSystolic ? parseInt(bloodPressureSystolic) : null,
      bloodPressureDiastolic: bloodPressureDiastolic ? parseInt(bloodPressureDiastolic) : null,
      respiratoryRate: respiratoryRate ? parseInt(respiratoryRate) : null,
      oxygenLevel: oxygenLevel ? parseFloat(oxygenLevel) : null,
    };

    // Ensure at least one vital is provided
    const hasVitals = Object.values(vitalsData).some((v) => v !== null);
    if (!hasVitals) {
      return res.status(400).json({
        success: false,
        message: "At least one vital sign is required",
      });
    }

    // Validate vitals
    const validationErrors = validateVitals(vitalsData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Generate IV and encrypt data
    const iv = generateIV();
    const encryptedData = encryptVitals(vitalsData, iv);

    // Encrypt notes if provided
    let encryptedNotes = null;
    if (notes && notes.trim()) {
      encryptedNotes = encryptVitals({ notes: notes.trim() }, iv);
    }

    // Create vitals record
    const vitals = await Vitals.create({
      patient: targetPatientId,
      recordedBy: req.user._id,
      recorderRole: req.user.role,
      encryptedData,
      encryptionIV: iv,
      encryptedNotes,
      recordedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Vitals recorded successfully",
      data: {
        _id: vitals._id,
        recordedAt: vitals.recordedAt,
        recorderRole: vitals.recorderRole,
        // Return decrypted data for immediate display
        vitals: vitalsData,
        notes: notes?.trim() || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get patient's vitals history
 * @route   GET /api/vitals/patient/:patientId
 * @access  Private (Patient owner or authorized Doctor)
 */
const getPatientVitals = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    // Authorization check
    if (req.user.role === "patient") {
      // Patients can only view their own vitals
      const patient = await Patient.findOne({ email: req.user.email });
      if (!patient || patient._id.toString() !== patientId) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own vitals",
        });
      }
    } else if (req.user.role === "doctor") {
      // Doctors can view any patient's vitals (could add access control logic here)
      const patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
        });
      }
    }

    // Fetch vitals with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const vitals = await Vitals.find({ patient: patientId, isActive: true })
      .sort({ recordedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Count total
    const total = await Vitals.countDocuments({ patient: patientId, isActive: true });

    // Decrypt vitals data
    const decryptedVitals = vitals.map((v) => {
      const decrypted = decryptVitals(v.encryptedData, v.encryptionIV);
      let notes = null;
      if (v.encryptedNotes) {
        const decryptedNotes = decryptVitals(v.encryptedNotes, v.encryptionIV);
        notes = decryptedNotes?.notes || null;
      }

      return {
        _id: v._id,
        recordedAt: v.recordedAt,
        recorderRole: v.recorderRole,
        vitals: decrypted,
        notes,
        createdAt: v.createdAt,
      };
    });

    res.json({
      success: true,
      data: decryptedVitals,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get my vitals (for logged-in patient)
 * @route   GET /api/vitals/my-vitals
 * @access  Private (Patient only)
 */
const getMyVitals = async (req, res, next) => {
  try {
    const { limit = 50, page = 1 } = req.query;

    // Get patient ID from user
    const patient = await Patient.findOne({ email: req.user.email });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    // Fetch vitals with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const vitals = await Vitals.find({ patient: patient._id, isActive: true })
      .sort({ recordedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Count total
    const total = await Vitals.countDocuments({ patient: patient._id, isActive: true });

    // Decrypt vitals data
    const decryptedVitals = vitals.map((v) => {
      const decrypted = decryptVitals(v.encryptedData, v.encryptionIV);
      let notes = null;
      if (v.encryptedNotes) {
        const decryptedNotes = decryptVitals(v.encryptedNotes, v.encryptionIV);
        notes = decryptedNotes?.notes || null;
      }

      return {
        _id: v._id,
        recordedAt: v.recordedAt,
        recorderRole: v.recorderRole,
        vitals: decrypted,
        notes,
        createdAt: v.createdAt,
      };
    });

    res.json({
      success: true,
      data: decryptedVitals,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a vitals record
 * @route   DELETE /api/vitals/:id
 * @access  Private (Record owner only)
 */
const deleteVitals = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vitals = await Vitals.findById(id);
    if (!vitals) {
      return res.status(404).json({
        success: false,
        message: "Vitals record not found",
      });
    }

    // Only the recorder can delete (or admin)
    if (vitals.recordedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own recordings",
      });
    }

    // Soft delete
    vitals.isActive = false;
    await vitals.save();

    res.json({
      success: true,
      message: "Vitals record deleted",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get vitals statistics/trends
 * @route   GET /api/vitals/trends/:patientId
 * @access  Private (Patient owner or Doctor)
 */
const getVitalsTrends = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { days = 30 } = req.query;

    // Authorization check
    if (req.user.role === "patient") {
      const patient = await Patient.findOne({ email: req.user.email });
      if (!patient || patient._id.toString() !== patientId) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own trends",
        });
      }
    }

    // Fetch vitals for the specified period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const vitals = await Vitals.find({
      patient: patientId,
      isActive: true,
      recordedAt: { $gte: startDate },
    })
      .sort({ recordedAt: 1 })
      .lean();

    // Decrypt and aggregate
    const trends = {
      temperature: [],
      heartRate: [],
      bloodPressure: [],
      respiratoryRate: [],
      oxygenLevel: [],
    };

    vitals.forEach((v) => {
      const decrypted = decryptVitals(v.encryptedData, v.encryptionIV);
      if (!decrypted) return;

      const timestamp = v.recordedAt;

      if (decrypted.temperature) {
        trends.temperature.push({ timestamp, value: decrypted.temperature });
      }
      if (decrypted.heartRate) {
        trends.heartRate.push({ timestamp, value: decrypted.heartRate });
      }
      if (decrypted.bloodPressureSystolic && decrypted.bloodPressureDiastolic) {
        trends.bloodPressure.push({
          timestamp,
          systolic: decrypted.bloodPressureSystolic,
          diastolic: decrypted.bloodPressureDiastolic,
        });
      }
      if (decrypted.respiratoryRate) {
        trends.respiratoryRate.push({ timestamp, value: decrypted.respiratoryRate });
      }
      if (decrypted.oxygenLevel) {
        trends.oxygenLevel.push({ timestamp, value: decrypted.oxygenLevel });
      }
    });

    // Calculate averages
    const calculateAverage = (arr) => {
      if (arr.length === 0) return null;
      const sum = arr.reduce((acc, item) => acc + item.value, 0);
      return Math.round((sum / arr.length) * 10) / 10;
    };

    const averages = {
      temperature: calculateAverage(trends.temperature),
      heartRate: calculateAverage(trends.heartRate),
      respiratoryRate: calculateAverage(trends.respiratoryRate),
      oxygenLevel: calculateAverage(trends.oxygenLevel),
      bloodPressureSystolic: trends.bloodPressure.length > 0
        ? Math.round(trends.bloodPressure.reduce((acc, item) => acc + item.systolic, 0) / trends.bloodPressure.length)
        : null,
      bloodPressureDiastolic: trends.bloodPressure.length > 0
        ? Math.round(trends.bloodPressure.reduce((acc, item) => acc + item.diastolic, 0) / trends.bloodPressure.length)
        : null,
    };

    res.json({
      success: true,
      data: {
        trends,
        averages,
        period: {
          start: startDate,
          end: new Date(),
          days: parseInt(days),
        },
        totalReadings: vitals.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordVitals,
  getPatientVitals,
  getMyVitals,
  deleteVitals,
  getVitalsTrends,
};
