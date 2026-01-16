const express = require("express");
const router = express.Router();

const classController = require("../controllers/class.controller");

/* ================= CLASS ROUTES ================= */

// GET all classes
router.get("/", classController.getAllClasses);

// GET class list with prerequisites
router.get("/with-prereq", classController.getClassListWithPrereq);

// GET class schedule
router.get("/schedule", classController.getClassSchedule);

// GET class by ID (for Edit page)
router.get("/:id", classController.getClassById);

router.get("/:id/prerequisites", classController.getClassPrerequisites);

// ADD class (handles prereqs internally)
router.post("/", classController.addClass);

// Add a prerequisite to an existing class
router.post("/:id/prerequisites", classController.addPrerequisite);

router.put("/:id", classController.updateClass);

// DELETE class
router.delete("/:id", classController.deleteClass);

router.delete("/prerequisites/:prerequisite_id", classController.deletePrerequisite);

module.exports = router;
