const mongoose = require("mongoose");
const Visit = require("../models/Visit");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");

/**
 * Create a new visit with prescriptions
 * Uses Mongoose transaction for database consistency
 */
exports.createVisit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

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

    const doctorId = req.user.id;

    // Validate patient exists
    const patient = await Patient.findById(patientId).session(session);
    if (!patient) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Patient not found" });
    }

    // Validate doctor exists
    const doctor = await Doctor.findById(doctorId).session(session);
    if (!doctor) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Create the visit
    const visit = new Visit({
      patient: patientId,
      doctor: doctorId,
      visitDate: new Date(),
      visitType: visitType || "routine",
      chiefComplaint,
      vitals: vitals || {},
      symptoms: symptoms || [],
      diagnosis,
      notes,
      prescriptions: prescriptions || [],
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      status: "completed",
    });

    await visit.save({ session });

    // Commit the transaction
    await session.commitTransaction();

    // Populate and return the created visit
    const populatedVisit = await Visit.findById(visit._id)
      .populate("patient", "name email")
      .populate("doctor", "name email specialty");

    res.status(201).json({
      message: "Visit created successfully",
      visit: populatedVisit,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error creating visit:", error);
    res.status(500).json({ message: "Failed to create visit", error: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Get all visits for a specific patient
 */
exports.getPatientVisits = async (req, res) => {
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
      visits,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching patient visits:", error);
    res.status(500).json({ message: "Failed to fetch visits", error: error.message });
  }
};

/**
 * Get all visits for a specific doctor
 */
exports.getDoctorVisits = async (req, res) => {
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
      visits,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching doctor visits:", error);
    res.status(500).json({ message: "Failed to fetch visits", error: error.message });
  }
};

/**
 * Get a single visit by ID
 */
exports.getVisitById = async (req, res) => {
  try {
    const { visitId } = req.params;

    const visit = await Visit.findById(visitId)
      .populate("patient", "name email")
      .populate("doctor", "name email specialty")
      .populate("attachments");

    if (!visit) {
      return res.status(404).json({ message: "Visit not found" });
    }

    res.json({ visit });
  } catch (error) {
    console.error("Error fetching visit:", error);
    res.status(500).json({ message: "Failed to fetch visit", error: error.message });
  }
};

/**
 * Update a visit
 */
exports.updateVisit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { visitId } = req.params;
    const updates = req.body;

    const visit = await Visit.findById(visitId).session(session);
    if (!visit) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Visit not found" });
    }

    // Verify the doctor making the update is the one who created the visit
    if (visit.doctor.toString() !== req.user.id) {
      await session.abortTransaction();
      return res.status(403).json({ message: "Not authorized to update this visit" });
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

    await visit.save({ session });
    await session.commitTransaction();

    const updatedVisit = await Visit.findById(visitId)
      .populate("patient", "name email")
      .populate("doctor", "name email specialty");

    res.json({
      message: "Visit updated successfully",
      visit: updatedVisit,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error updating visit:", error);
    res.status(500).json({ message: "Failed to update visit", error: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Add prescription to existing visit
 */
exports.addPrescription = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { visitId } = req.params;
    const { prescription } = req.body;

    const visit = await Visit.findById(visitId).session(session);
    if (!visit) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Visit not found" });
    }

    // Verify authorization
    if (visit.doctor.toString() !== req.user.id) {
      await session.abortTransaction();
      return res.status(403).json({ message: "Not authorized" });
    }

    visit.prescriptions.push(prescription);
    await visit.save({ session });
    await session.commitTransaction();

    res.json({
      message: "Prescription added successfully",
      prescriptions: visit.prescriptions,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error adding prescription:", error);
    res.status(500).json({ message: "Failed to add prescription", error: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Get all patients for dropdown (for doctor to select)
 */
exports.getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.find({}, "name email _id").sort({ name: 1 });
    res.json({ patients });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ message: "Failed to fetch patients", error: error.message });
  }
};

/**
 * Get visit statistics for doctor dashboard
 */
exports.getVisitStats = async (req, res) => {
  try {
    const doctorId = req.user.id;
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
      stats: {
        totalVisits,
        todayVisits,
        thisWeekVisits,
      },
      recentVisits,
    });
  } catch (error) {
    console.error("Error fetching visit stats:", error);
    res.status(500).json({ message: "Failed to fetch stats", error: error.message });
  }
};
