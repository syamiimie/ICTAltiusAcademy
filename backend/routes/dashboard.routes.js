const express = require("express");
const router = express.Router();
const c = require("../controllers/dashboard.controller");

// DASHBOARD STATS
router.get("/", c.getDashboardStats);

module.exports = router;
