const express = require("express");
const router = express.Router();
const c = require("../controllers/attendance.controller");

router.get("/class/:class_id/students", c.getStudentsByClass);
router.get("/", c.getAllAttendance);
router.get("/:id", c.getAttendanceById);
router.put("/:id", c.updateAttendance);

module.exports = router;
