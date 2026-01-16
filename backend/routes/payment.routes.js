const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");


//1. Get student payment's summary
router.get('/student-payment-summary', paymentController.getStudentPaymentSummary);

// 2. Get all enrollments for a student
router.get("/enrollments", paymentController.getEnrollmentsByStudent);

// 3. Add payment for specific enrollment
router.post("/", paymentController.addPaymentForEnrollment);

//4. generate receipt
router.get("/receipt", paymentController.getReceiptByEnrollmentId);


module.exports = router;
