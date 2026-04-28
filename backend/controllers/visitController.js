const mongoose = require("mongoose");
const Visit = require("../models/Visit");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");

/**
 * Create a new visit with prescriptions
 * Works with standalone MongoDB or replica sets
 */
exports.createVisit = async (req, res, next) => {
  try {
    const {
      patientId,
      visitType,
      chiefComplaint,
      vitals,
      symptoms,
      diagnosis,
      notes,
      prescriptions,
      followUpDate,
    } = req.body;

    const doctorId = req.user?.id;

    // Validate required fields
    if (!patientId || !doctorId) {
      return res.status(400).json({ 
        success: false,
        message: "Patient ID and Doctor ID are required" 
      });
    }

    if (!chiefComplaint || !chiefComplaint.trim()) {
      return res.status(400).json({ 
        success: false,
        message: "Chief complaint is required" 
      });
    }

    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ 
        success: false,
        message: "Patient not found" 
      });
    }

    // Validate doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ 
        success: false,
        message: "Doctor not found" 
      });
    }

    // Parse and convert vitals from strings to numbers
    const parseVitals = (vitalsData) => {
      if (!vitalsData) return {};
      
      const parsed = {};
      
      // Temperature
      if (vitalsData.temperature?.value) {
        parsed.temperature = {
          value: parseFloat(vitalsData.temperature.value) || undefined,
          unit: vitalsData.temperature.unit || "°F",
        };
      }
      
      // Heart Rate
      if (vitalsData.heartRate?.value) {
        parsed.heartRate = {
          value: parseFloat(vitalsData.heartRate.value) || undefined,
          unit: vitalsData.heartRate.unit || "bpm",
        };
      }
      
      // Blood Pressure
      if (vitalsData.bloodPressure?.systolic && vitalsData.bloodPressure?.diastolic) {
        parsed.bloodPressure = {
          systolic: parseFloat(vitalsData.bloodPressure.systolic) || undefined,
          diastolic: parseFloat(vitalsData.bloodPressure.diastolic) || undefined,
          unit: vitalsData.bloodPressure.unit || "mmHg",
        };
      }
      
      // Respiratory Rate
      if (vitalsData.respiratoryRate?.value) {
        parsed.respiratoryRate = {
          value: parseFloat(vitalsData.respiratoryRate.value) || undefined,
          unit: vitalsData.respiratoryRate.unit || "breaths/min",
        };
      }
      
      // Oxygen Saturation
      if (vitalsData.oxygenSaturation?.value) {
        parsed.oxygenSaturation = {
          value: parseFloat(vitalsData.oxygenSaturation.value) || undefined,
          unit: vitalsData.oxygenSaturation.unit || "%",
        };
      }
      
      // Weight
      if (vitalsData.weight?.value) {
        parsed.weight = {
          value: parseFloat(vitalsData.weight.value) || undefined,
          unit: vitalsData.weight.unit || "kg",
        };
      }
      
      // Height
      if (vitalsData.height?.value) {
        parsed.height = {
          value: parseFloat(vitalsData.height.value) || undefined,
          unit: vitalsData.height.unit || "cm",
        };
      }
      
      return parsed;
    };

    // Create the visit (without transactions for standalone MongoDB)
    const visit = new Visit({
      patient: patientId,
      doctor: doctorId,
      visitDate: new Date(),
      visitType: visitType || "routine",
      chiefComplaint: chiefComplaint.trim(),
      vitals: parseVitals(vitals),
      symptoms: Array.isArray(symptoms) ? symptoms.filter(s => s.trim()) : [],
      diagnosis: diagnosis || "",
      notes: notes || "",
      prescriptions: Array.isArray(prescriptions) ? prescriptions : [],
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      status: "completed",
    });

    await visit.save();

    // Populate and return the created visit
    const populatedVisit = await Visit.findById(visit._id)
      .populate("patient", "name email")
      .populate("doctor", "name email specialty");

    res.status(201).json({
      success: true,
      message: "Visit created successfully",
      visit: populatedVisit,
    });
  } catch (error) {
    console.error("Error creating visit:", error.message, error.stack);
    next(error);
  }
};

/**
 * Get all visits for a specific patient
 */
exports.getPatientVisits = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const visits = await Visit.find({ patient: patientId })
      .populate("doctor", "name email specialty")
      .sort({ visitDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Visit.countDocuments({ patient: patientId });

    res.json({
      success: true,
      visits,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all visits for a specific doctor
 */
exports.getDoctorVisits = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { page = 1, limit = 10, patientId } = req.query;

    const filter = { doctor: doctorId };
    if (patientId) {
      filter.patient = patientId;
    }

    const visits = await Visit.find(filter)
      .populate("patient", "name email")
      .sort({ visitDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Visit.countDocuments(filter);

    res.json({
      success: true,
      visits,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single visit by ID
 */
exports.getVisitById = async (req, res, next) => {
  try {
    const { visitId } = req.params;

    const visit = await Visit.findById(visitId)
      .populate("patient", "name email")
      .populate("doctor", "name email specialty")
      .populate("attachments");

    if (!visit) {
      return res.status(404).json({ 
        success: false,
        message: "Visit not found" 
      });
    }

    res.json({ 
      success: true,
      data: visit 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a visit
 */
exports.updateVisit = async (req, res, next) => {
  try {
    const { visitId } = req.params;
    const updates = req.body;
    const doctorId = req.user?.id;

    if (!visitId || !doctorId) {
      return res.status(400).json({ 
        success: false,
        message: "Visit ID and Doctor ID are required" 
      });
    }

    const visit = await Visit.findById(visitId);
    if (!visit) {
      return res.status(404).json({ 
        success: false,
        message: "Visit not found" 
      });
    }

    // Verify the doctor making the update is the one who created the visit
    if (visit.doctor.toString() !== doctorId) {
      return res.status(403).json({ 
        success: false,
        message: "Not authorized to update this visit" 
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      "visitType",
      "chiefComplaint",
      "vitals",
      "symptoms",
      "diagnosis",
      "notes",
      "prescriptions",
      "followUpDate",
      "status",
    ];

    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        visit[field] = updates[field];
      }
    });

    await visit.save();

    const updatedVisit = await Visit.findById(visitId)
      .populate("patient", "name email")
      .populate("doctor", "name email specialty");

    res.json({
      success: true,
      message: "Visit updated successfully",
      data: updatedVisit,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add prescription to existing visit
 */
exports.addPrescription = async (req, res, next) => {
  try {
    const { visitId } = req.params;
    const { prescription } = req.body;
    const doctorId = req.user?.id;

    if (!visitId || !doctorId || !prescription) {
      return res.status(400).json({ 
        success: false,
        message: "Visit ID, prescription data, and Doctor ID are required" 
      });
    }

    const visit = await Visit.findById(visitId);
    if (!visit) {
      return res.status(404).json({ 
        success: false,
        message: "Visit not found" 
      });
    }

    // Verify authorization
    if (visit.doctor.toString() !== doctorId) {
      return res.status(403).json({ 
        success: false,
        message: "Not authorized to add prescriptions to this visit" 
      });
    }

    visit.prescriptions.push(prescription);
    await visit.save();

    res.json({
      success: true,
      message: "Prescription added successfully",
      data: {
        visitId: visit._id,
        prescriptions: visit.prescriptions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all patients for dropdown (for doctor to select)
 */
exports.getAllPatients = async (req, res, next) => {
  try {
    const patients = await Patient.find({}, "name email _id").sort({ name: 1 });
    res.json({ 
      success: true,
      patients: patients 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get visit statistics for doctor dashboard
 */
exports.getVisitStats = async (req, res, next) => {
  try {
    const doctorId = req.user?.id;

    if (!doctorId) {
      return res.status(400).json({ 
        success: false,
        message: "Doctor ID is required" 
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalVisits, todayVisits, thisWeekVisits, recentVisits] = await Promise.all([
      Visit.countDocuments({ doctor: doctorId }),
      Visit.countDocuments({
        doctor: doctorId,
        visitDate: { $gte: today },
      }),
      Visit.countDocuments({
        doctor: doctorId,
        visitDate: {
          $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
      }),
      Visit.find({ doctor: doctorId })
        .populate("patient", "name")
        .sort({ visitDate: -1 })
        .limit(5),
    ]);

    res.json({
      success: true,
      stats: {
        totalVisits,
        todayVisits,
        thisWeekVisits,
      },
      recentVisits,
    });
  } catch (error) {
    next(error);
  }
};
