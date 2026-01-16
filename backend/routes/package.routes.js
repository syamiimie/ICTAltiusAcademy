const express = require("express");
const router = express.Router();
const controller = require("../controllers/package.controller");

router.get("/", controller.getAllPackages);
router.get("/:id", controller.getPackageById);
router.post("/", controller.addPackage);
router.put("/:id", controller.updatePackage);
router.delete("/:id", controller.deletePackage);

module.exports = router;
