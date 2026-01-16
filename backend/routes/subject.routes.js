const express = require("express");
const router = express.Router();
const controller = require("../controllers/subject.controller");

router.get("/", controller.getAllSubjects);
router.get("/:id", controller.getSubjectById);
router.get("/by-package/:id", controller.getSubjectsByPackage);
router.post("/", controller.addSubject);
router.put("/:id", controller.updateSubject);
router.delete("/:id", controller.deleteSubject);

module.exports = router;
