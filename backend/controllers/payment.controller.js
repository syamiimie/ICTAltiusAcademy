const oracledb = require("oracledb");
const db = require("../db/db");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
/* ================= GET ENROLLMENTS BY STUDENT ================= */
exports.getEnrollmentsByStudent = async (req, res) => {
  const { studentId } = req.query;
  let conn;

  try {
    conn = await oracledb.getConnection(db);

    const result = await conn.execute(
      `
      SELECT
        pkg.Package_ID,
        pkg.Package_Name,
        NVL(pkg.Package_Fee, 0) AS PACKAGE_FEE,

        COUNT(e.Enroll_ID) AS ENROLLMENT_COUNT,
        SUM(CASE WHEN e.Payment_ID IS NULL THEN 1 ELSE 0 END) AS UNPAID_COUNT,
        SUM(CASE WHEN e.Payment_ID IS NOT NULL THEN 1 ELSE 0 END) AS PAID_COUNT,

        LISTAGG(e.Enroll_ID, ', ') 
          WITHIN GROUP (ORDER BY e.Enroll_ID) AS ENROLLMENT_IDS,  -- Already sorted

        LISTAGG(
          CASE WHEN e.Payment_ID IS NOT NULL THEN e.Enroll_ID END,
          ', '
        ) WITHIN GROUP (ORDER BY e.Enroll_ID) AS PAID_ENROLLMENT_IDS,

        MIN(CASE WHEN e.Payment_ID IS NULL THEN e.Enroll_ID END)
          AS FIRST_UNPAID_ENROLLMENT_ID,

        MIN(CASE WHEN e.Payment_ID IS NOT NULL THEN e.Enroll_ID END)
          AS FIRST_PAID_ENROLLMENT_ID

      FROM ALTIUS_DB.Enrollment e
      JOIN ALTIUS_DB.Package pkg
        ON e.Package_ID = pkg.Package_ID
      WHERE e.Student_ID = :studentId
      GROUP BY
        pkg.Package_ID,
        pkg.Package_Name,
        pkg.Package_Fee
      ORDER BY MIN(e.Enroll_ID)  -- Sort packages by their lowest enrollment ID
      `,
      { studentId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching enrollments");
  } finally {
    if (conn) await conn.close();
  }
};


/* ================= ADD PAYMENT FOR SPECIFIC ENROLLMENT ================= */
exports.addPaymentForEnrollment = async (req, res) => {
  const { enrollmentId, paymentDate, totalFees } = req.body;
  let conn;

  try {
    conn = await oracledb.getConnection(db);

    // 1️⃣ Insert Payment
    const paymentResult = await conn.execute(
      `
      INSERT INTO ALTIUS_DB.Payment
        (Payment_ID, Payment_Date, Total_Fees)
      VALUES
        (ALTIUS_DB.Payment_SEQ.NEXTVAL, TO_DATE(:paymentDate, 'YYYY-MM-DD'), :totalFees)
      RETURNING Payment_ID INTO :paymentId
      `,
      {
        paymentDate,
        totalFees,
        paymentId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    const paymentId = paymentResult.outBinds.paymentId[0];

    // 2️⃣ Attach Payment to Enrollment
    const updateResult = await conn.execute(
      `
      UPDATE ALTIUS_DB.Enrollment
      SET Payment_ID = :paymentId
      WHERE Enroll_ID = :enrollmentId
        AND Payment_ID IS NULL
      `,
      { paymentId, enrollmentId }
    );

    if (updateResult.rowsAffected === 0) {
      throw new Error("Enrollment not found or already has a payment");
    }

    await conn.commit();
    res.status(201).send("Payment added successfully");

  } catch (err) {
    console.error("ORACLE ERROR:", err);
    res.status(500).send(err.message || "Error adding payment");
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= STUDENT PAYMENT SUMMARY ================= */
exports.getStudentPaymentSummary = async (req, res) => {
  const studentId = Number(req.query.studentId);

  if (!studentId || isNaN(studentId)) {
    return res.status(400).json({
      message: "Valid studentId is required"
    });
  }
  let conn;

  try {
    conn = await oracledb.getConnection(db);

    const result = await conn.execute(
      `
      SELECT
        s.Student_Name AS studentName,
        NVL(SUM(p.Total_Fees), 0) AS totalPaid
      FROM ALTIUS_DB.Student s
      JOIN ALTIUS_DB.Enrollment e
        ON s.Student_ID = e.Student_ID
      LEFT JOIN ALTIUS_DB.Payment p
        ON e.Payment_ID = p.Payment_ID
      WHERE s.Student_ID = :studentId
      GROUP BY s.Student_Name
      `,
      { studentId: { val: studentId, type: oracledb.NUMBER } },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );        

    if (result.rows.length === 0) {
      return res.status(404).send("Student not found");
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Student payment summary error:", err);
    res.status(500).send("Error fetching student payment summary");
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= RECEIPT BY ENROLLMENT ================= */
exports.getReceiptByEnrollmentId = async (req, res) => {
  const enrollId = Number(req.query.enrollId);

  if (!enrollId || isNaN(enrollId)) {
    return res.status(400).send("Valid enrollId is required");
  }

  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const result = await conn.execute(
      `
      SELECT
        s.Student_Name,
        s.Student_IC,
        e.Enroll_ID,
        e.Enroll_Date,
        pkg.Package_Name,
        NVL(pkg.Package_Fee, 0) AS PACKAGE_FEE,  
        pay.Payment_ID,
        pay.Payment_Date,
        pay.Total_Fees
      FROM ALTIUS_DB.Enrollment e
      JOIN ALTIUS_DB.Student s
        ON e.Student_ID = s.Student_ID
      JOIN ALTIUS_DB.Package pkg
        ON e.Package_ID = pkg.Package_ID
      JOIN ALTIUS_DB.Payment pay
        ON e.Payment_ID = pay.Payment_ID
      WHERE e.Enroll_ID = :enrollId
      `,
      { enrollId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Receipt not found");
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Receipt error:", err);
    res.status(500).send("Error generating receipt");
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= STUDENT OUTSTANDING FEES ================= */
exports.getStudentOutstandingFees = async (req, res) => {
  const studentId = Number(req.query.studentId);

  if (!studentId || isNaN(studentId)) {
    return res.status(400).json({
      message: "Valid studentId is required"
    });
  }
  let conn;

  try {
    conn = await oracledb.getConnection(db);

    const result = await conn.execute(
      `
      SELECT
        COALESCE(SUM(
          CASE 
            WHEN e.Payment_ID IS NULL THEN pkg.Package_Fee
            ELSE 0
          END
        ), 0) AS OUTSTANDING_FEES
      FROM ALTIUS_DB.Enrollment e
      JOIN ALTIUS_DB.Package pkg
        ON e.Package_ID = pkg.Package_ID
      WHERE e.Student_ID = :studentId
      `,
      { studentId: { val: studentId, type: oracledb.NUMBER } },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );        

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Student outstanding fees error:", err);
    res.status(500).send("Error calculating outstanding fees");
  } finally {
    if (conn) await conn.close();
  }
};

