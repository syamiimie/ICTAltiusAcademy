const express = require("express");
const router = express.Router();
const c = require("../controllers/attendanceReport.controller");

router.get("/", c.getAttendanceReport);

module.exports = router;
