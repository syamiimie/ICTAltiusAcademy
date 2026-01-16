const oracledb = require("oracledb");
const db = require("../db/db");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

/* ================= GET ALL ATTENDANCE ================= */
exports.getAllAttendance = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const r = await conn.execute(`
      SELECT
        a.attend_id        AS "attend_id",
        TO_CHAR(a.attend_date,'YYYY-MM-DD') AS "attend_date",
        a.attend_status    AS "attend_status",
        s.student_name     AS "student_name",
        c.class_name       AS "class_name"
      FROM attendance a
      JOIN student s ON a.student_id = s.student_id
      JOIN class c ON a.class_id = c.class_id
      ORDER BY a.attend_date DESC
    `);

    res.json(r.rows);
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= GET ATTENDANCE BY ID ================= */
exports.getAttendanceById = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const r = await conn.execute(`
      SELECT
        attend_id   AS "attend_id",
        TO_CHAR(attend_date,'YYYY-MM-DD') AS "attend_date",
        attend_status AS "attend_status",
        student_id  AS "student_id",
        class_id    AS "class_id"
      FROM attendance
      WHERE attend_id = :id
    `, { id: req.params.id });

    res.json(r.rows[0]);
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= GET STUDENTS BY CLASS (🔥 FIXED) ================= */
exports.getStudentsByClass = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const r = await conn.execute(`
      SELECT DISTINCT
        s.student_id   AS "student_id",
        s.student_name AS "student_name"
      FROM class c
      JOIN subject sub   ON c.subject_id = sub.subject_id
      JOIN package p     ON sub.package_id = p.package_id
      JOIN enrollment e  ON e.package_id = p.package_id
      JOIN student s     ON e.student_id = s.student_id
      WHERE c.class_id = :class_id
      ORDER BY s.student_name
    `, { class_id: req.params.class_id });

    res.json(r.rows);
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= UPDATE ATTENDANCE ================= */
exports.updateAttendance = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    await conn.execute(`
      UPDATE attendance
      SET attend_date = TO_DATE(:attend_date,'YYYY-MM-DD'),
          attend_status = :attend_status,
          student_id = :student_id,
          class_id = :class_id
      WHERE attend_id = :id
    `, { ...req.body, id: req.params.id });

    await conn.commit();
    res.json({ message: "Attendance updated" });
  } finally {
    if (conn) await conn.close();
  }
};
