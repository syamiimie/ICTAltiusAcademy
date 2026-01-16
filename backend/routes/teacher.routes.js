const express = require("express");
const router = express.Router();
const c = require("../controllers/teacher.controller");

router.get("/", c.getAllTeachers);
router.get("/:id", c.getTeacherById);
router.post("/", c.addTeacher);
router.put("/:id", c.updateTeacher);
router.delete("/:id", c.deleteTeacher);

module.exports = router;
