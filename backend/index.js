const express = require("express");
const cors = require("cors");

const studentRoutes = require("./routes/student.routes");
const staffRoutes = require("./routes/staff.routes");
const reportRoutes = require("./routes/report.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const paymentRoutes = require("./routes/payment.routes");
const attendanceReportRoutes = require("./routes/attendanceReport.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());                
app.use(express.urlencoded({ extended:true }));

app.use("/students", studentRoutes);
app.use("/staff", staffRoutes);
app.use("/auth", require("./routes/auth.routes"));
app.use("/teachers", require("./routes/teacher.routes"));
app.use("/packages", require("./routes/package.routes"));
app.use("/classes", require("./routes/class.routes"));
app.use("/subjects", require("./routes/subject.routes"));
app.use("/reports", reportRoutes);
app.use("/enrollments", require("./routes/enrollment.routes"));
app.use("/attendance", attendanceRoutes);
app.use("/payment", paymentRoutes);
app.use("/reports/attendance", attendanceReportRoutes);
app.use("/dashboard", dashboardRoutes);

app.listen(PORT, () => {
  console.log(`🚀 API running at http://localhost:${PORT}`);
});
