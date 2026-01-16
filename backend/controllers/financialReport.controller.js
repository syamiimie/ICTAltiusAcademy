const oracledb = require("oracledb");
const db = require("../db/db");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

exports.financialReport = async (req, res) => {
  const { month, outstandingOnly } = req.query;
  let conn;

  if (!month) {
    return res.status(400).json({ error: "Month is required" });
  }

  try {
    conn = await oracledb.getConnection(db);

    /* ===============================
       PAYMENT DETAILS (DETAIL LEVEL)
       =============================== */
    const paymentsResult = await conn.execute(
      `
      SELECT 
          s.STUDENT_NAME,
          pck.PACKAGE_NAME,
          pck.PACKAGE_FEE AS TOTAL_FEE,
          NVL(pay.Total_Fees,0) AS AMOUNT_PAID,
          pck.PACKAGE_FEE - NVL(pay.Total_Fees,0) AS OUTSTANDING
      FROM ENROLLMENT e
      JOIN STUDENT s ON e.STUDENT_ID = s.STUDENT_ID
      JOIN PACKAGE pck ON e.PACKAGE_ID = pck.PACKAGE_ID
      LEFT JOIN PAYMENT pay ON e.PAYMENT_ID = pay.PAYMENT_ID
      WHERE TO_CHAR(e.ENROLL_DATE,'YYYY-MM') = :month
      ${outstandingOnly === "true"
        ? "AND (pck.PACKAGE_FEE - NVL(pay.Total_Fees,0)) > 0"
        : ""}
      ORDER BY s.STUDENT_NAME
      `,
      { month }
    );

    /* ===============================
       SUMMARY (MATCH FILTER)
       =============================== */
    const summaryResult = await conn.execute(
      `
      SELECT 
          SUM(pck.PACKAGE_FEE) AS TOTAL_REVENUE,
          SUM(NVL(pay.Total_Fees,0)) AS TOTAL_COLLECTED,
          SUM(pck.PACKAGE_FEE - NVL(pay.Total_Fees,0)) AS OUTSTANDING_FEES,
          COUNT(*) AS TOTAL_ENROLLMENT
      FROM ENROLLMENT e
      JOIN PACKAGE pck ON e.PACKAGE_ID = pck.PACKAGE_ID
      LEFT JOIN PAYMENT pay ON e.PAYMENT_ID = pay.PAYMENT_ID
      WHERE TO_CHAR(e.ENROLL_DATE,'YYYY-MM') = :month
      ${outstandingOnly === "true"
        ? "AND (pck.PACKAGE_FEE - NVL(pay.Total_Fees,0)) > 0"
        : ""}
      `,
      { month }
    );

    res.json({
      summary: summaryResult.rows[0] || {
        TOTAL_REVENUE: 0,
        TOTAL_COLLECTED: 0,
        OUTSTANDING_FEES: 0,
        TOTAL_ENROLLMENT: 0
      },
      payments: paymentsResult.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to generate financial report"
    });
  } finally {
    if (conn) await conn.close();
  }
};
