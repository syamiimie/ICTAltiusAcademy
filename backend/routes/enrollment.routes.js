const express = require("express");
const router = express.Router();
const controller = require("../controllers/enrollment.controller");

/* ===== ENROLLMENTS ===== */

// GET all enrollments (used by list & edit pages)
router.get("/", controller.getAllEnrollments);

// ADD enrollment
router.post("/", controller.addEnrollment);

// UPDATE enrollment
router.put("/:id", controller.updateEnrollment);

// DELETE enrollment
router.delete("/:id", controller.deleteEnrollment);

module.exports = router;
