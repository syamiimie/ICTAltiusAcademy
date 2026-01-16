const express = require("express");
const router = express.Router();
const controller = require("../controllers/financialReport.controller");

router.get("/financial-report", controller.financialReport);

module.exports = router;
