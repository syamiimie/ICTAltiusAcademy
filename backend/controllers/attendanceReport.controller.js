const oracledb = require("oracledb");
const db = require("../db/db");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

exports.getAttendanceReport = async (req, res) => {
  const { month, status, percentage } = req.query;
  let conn;

  try {
    conn = await oracledb.getConnection(db);

    const sql = `
      SELECT
        s.STUDENT_NAME AS "student_name",
        c.CLASS_NAME   AS "class_name",
        COUNT(*)       AS "total_classes",
        SUM(CASE WHEN a.ATTEND_STATUS = 'Present' THEN 1 ELSE 0 END) AS "present_count",
        SUM(CASE WHEN a.ATTEND_STATUS = 'Absent' THEN 1 ELSE 0 END)  AS "absent_count",
        ROUND(
          (SUM(CASE WHEN a.ATTEND_STATUS = 'Present' THEN 1 ELSE 0 END) / COUNT(*)) * 100,
          2
        ) AS "attendance_percentage"
      FROM ATTENDANCE a
      JOIN STUDENT s ON a.STUDENT_ID = s.STUDENT_ID
      JOIN CLASS c ON a.CLASS_ID = c.CLASS_ID
      WHERE TO_CHAR(a.ATTEND_DATE,'YYYY-MM') = :month
      GROUP BY s.STUDENT_NAME, c.CLASS_NAME
      HAVING
        ${
          status === "Absent"
            ? `ROUND((SUM(CASE WHEN a.ATTEND_STATUS = 'Present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) < :percentage`
            : `ROUND((SUM(CASE WHEN a.ATTEND_STATUS = 'Present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) >= :percentage`
        }
      ORDER BY "attendance_percentage"
    `;

    const result = await conn.execute(sql, {
      month,
      percentage: Number(percentage)
    });

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  } finally {
    if (conn) await conn.close();
  }
};
