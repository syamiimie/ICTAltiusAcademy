const express = require("express");
const router = express.Router();
const controller = require("../controllers/student.controller");

router.get("/", controller.getAllStudents);
router.get("/:id", controller.getStudentById);
router.post("/", controller.addStudent);
router.put("/:id", controller.updateStudent);
router.delete("/:id", controller.deleteStudent);

module.exports = router;
