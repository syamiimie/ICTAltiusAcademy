const oracledb = require("oracledb");
const db = require("../db/db");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

exports.getDashboardStats = async (req, res) => {
  let conn;

  try {
    conn = await oracledb.getConnection(db);

    /* =========================
       STUDENT BREAKDOWN
       ========================= */
    const studentStats = await conn.execute(`
      SELECT
        COUNT(*) AS TOTAL_STUDENTS,
        SUM(CASE WHEN STUDENT_TYPE = 'Primary' THEN 1 ELSE 0 END) AS PRIMARY_STUDENTS,
        SUM(CASE WHEN STUDENT_TYPE = 'Secondary' THEN 1 ELSE 0 END) AS SECONDARY_STUDENTS
      FROM STUDENT
    `);

    /* =========================
       TOTAL CLASSES
       ========================= */
    const classStats = await conn.execute(`
      SELECT COUNT(*) AS TOTAL_CLASSES
      FROM CLASS
    `);

    /* =========================
       AVERAGE ATTENDANCE
       ========================= */
    const attendanceAvg = await conn.execute(`
      SELECT ROUND(
        (SUM(CASE WHEN ATTEND_STATUS = 'Present' THEN 1 ELSE 0 END)
        / COUNT(*)) * 100,
        2
      ) AS AVG_ATTENDANCE
      FROM ATTENDANCE
    `);

    /* =========================
       STUDENTS BELOW 75%
       ========================= */
    const lowAttendance = await conn.execute(`
      SELECT COUNT(*) AS LOW_ATTENDANCE
      FROM (
        SELECT STUDENT_ID,
        (SUM(CASE WHEN ATTEND_STATUS='Present' THEN 1 ELSE 0 END)/COUNT(*))*100 AS PCT
        FROM ATTENDANCE
        GROUP BY STUDENT_ID
        HAVING (SUM(CASE WHEN ATTEND_STATUS='Present' THEN 1 ELSE 0 END)/COUNT(*))*100 < 75
      )
    `);

/* =========================
   FINANCIAL SNAPSHOT
   ========================= */
const financialStats = await conn.execute(`
  SELECT
    COUNT(*) AS TOTAL_ENROLLMENTS,

    -- Unpaid / partially paid enrollments
    SUM(
      CASE
        WHEN NVL(pay.TOTAL_FEES, 0) < pck.PACKAGE_FEE THEN 1
        ELSE 0
      END
    ) AS UNPAID_ENROLLMENTS,

    -- Payment Completion Rate (%)
    ROUND(
      (SUM(
        CASE
          WHEN NVL(pay.TOTAL_FEES, 0) >= pck.PACKAGE_FEE THEN 1
          ELSE 0
        END
      ) / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS PAYMENT_COMPLETION_RATE

  FROM ENROLLMENT e
  JOIN PACKAGE pck ON e.PACKAGE_ID = pck.PACKAGE_ID
  LEFT JOIN PAYMENT pay ON e.PAYMENT_ID = pay.PAYMENT_ID
`);

    res.json({
      students: studentStats.rows[0],
      classes: classStats.rows[0].TOTAL_CLASSES,
      avgAttendance: attendanceAvg.rows[0].AVG_ATTENDANCE + "%",
      lowAttendanceStudents: lowAttendance.rows[0].LOW_ATTENDANCE,
      financial: financialStats.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
};
