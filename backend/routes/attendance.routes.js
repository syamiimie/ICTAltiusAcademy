const express = require("express");
const router = express.Router();
const c = require("../controllers/attendance.controller");

/* TEST */
router.get("/test", (req, res) => {
  res.send("ATTENDANCE ROUTER WORKS");
});

/* SPECIFIC FIRST */
router.get("/class/:class_id/students", c.getStudentsByClass);

/* ID ROUTES */
router.get("/:id", c.getAttendanceById);
router.put("/:id", c.updateAttendance);
router.delete("/:id", c.deleteAttendance);

/* GENERAL */
router.get("/", c.getAllAttendance);
router.post("/bulk", c.bulkInsertAttendance);

module.exports = router;