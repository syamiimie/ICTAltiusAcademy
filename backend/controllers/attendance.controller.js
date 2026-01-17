const oracledb = require("oracledb");
const db = require("../db/db");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

/* ================= GET STUDENTS BY CLASS ================= */
exports.getStudentsByClass = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const r = await conn.execute(
      `
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
      `,
      { class_id: req.params.class_id }   // 🔥 STRING "C01"
    );

    res.json(r.rows);
  } catch (e) {
    console.error("getStudentsByClass:", e);
    res.status(500).json(e.message);
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= LIST ALL ATTENDANCE ================= */
exports.getAllAttendance = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const r = await conn.execute(`
      SELECT
        a.attend_id AS "attend_id",
        TO_CHAR(a.attend_date,'YYYY-MM-DD') AS "attend_date",
        a.attend_status AS "attend_status",
        s.student_name AS "student_name",
        c.class_id     AS "class_id",
        c.class_name   AS "class_name"
      FROM ALTIUS_DB.attendance a
      JOIN ALTIUS_DB.student s ON a.student_id = s.student_id
      JOIN ALTIUS_DB.class c   ON a.class_id = c.class_id
      ORDER BY a.attend_date DESC
    `);

    res.json(r.rows);

  } catch (e) {
    console.error("getAllAttendance:", e);
    res.status(500).json(e.message);
  } finally {
    if (conn) await conn.close();
  }
};


/* ================= GET ATTENDANCE BY ID (EDIT LOAD) ================= */
exports.getAttendanceById = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const r = await conn.execute(
      `
      SELECT
        attend_id        AS "attend_id",
        TO_CHAR(attend_date,'YYYY-MM-DD') AS "attend_date",
        attend_status    AS "attend_status",
        student_id       AS "student_id",
        class_id         AS "class_id"
      FROM ALTIUS_DB.ATTENDANCE
      WHERE attend_id = :id
      `,
      { id: req.params.id }
    );

    if (r.rows.length === 0) {
      return res.status(404).json("Attendance not found");
    }

    res.json(r.rows[0]);
  } catch (e) {
    console.error("getAttendanceById:", e);
    res.status(500).json(e.message);
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= ADD (BULK INSERT) ================= */
exports.bulkInsertAttendance = async (req, res) => {
  console.log("🔥 ADD ATTENDANCE HIT", req.body);

  const { attend_date, class_id, records } = req.body;

  if (!attend_date || !class_id || !records || records.length === 0) {
    return res.status(400).json("Invalid data");
  }

  let conn;
  try {
    conn = await oracledb.getConnection(db);

    for (const r of records) {
      await conn.execute(
        `
        INSERT INTO ALTIUS_DB.ATTENDANCE
        (ATTEND_ID, ATTEND_DATE, ATTEND_STATUS, STUDENT_ID, CLASS_ID)
        VALUES
        (
          ALTIUS_DB.ATTENDANCE_SEQ.NEXTVAL,
          TO_DATE(:d,'YYYY-MM-DD'),
          :s,
          :sid,
          :cid
        )
        `,
        {
          d: attend_date,
          s: r.status,
          sid: r.student_id,
          cid: class_id   // 🔥 STRING "C01"
        }
      );
    }

    await conn.commit();
    res.json({ message: "Attendance saved" });

  } catch (e) {
    console.error("bulkInsertAttendance:", e);
    res.status(500).json(e.message);
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= UPDATE (EDIT SAVE) ================= */
exports.updateAttendance = async (req, res) => {
  const { attend_date, attend_status, student_id, class_id } = req.body;

  if (!attend_date || !attend_status || !student_id || !class_id) {
    return res.status(400).json("Invalid data");
  }

  let conn;
  try {
    conn = await oracledb.getConnection(db);

    await conn.execute(
      `
      UPDATE ALTIUS_DB.ATTENDANCE
      SET
        attend_date   = TO_DATE(:d,'YYYY-MM-DD'),
        attend_status = :s,
        student_id    = :sid,
        class_id      = :cid
      WHERE attend_id = :id
      `,
      {
        d: attend_date,
        s: attend_status,
        sid: student_id,
        cid: class_id,       // 🔥 STRING "C01"
        id: req.params.id
      }
    );

    await conn.commit();
    res.json({ message: "Attendance updated" });

  } catch (e) {
    console.error("updateAttendance:", e);
    res.status(500).json(e.message);
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= DELETE ================= */
exports.deleteAttendance = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    await conn.execute(
      `DELETE FROM ALTIUS_DB.ATTENDANCE WHERE attend_id = :id`,
      { id: req.params.id }
    );

    await conn.commit();
    res.json({ message: "Deleted" });

  } catch (e) {
    console.error("deleteAttendance:", e);
    res.status(500).json(e.message);
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= TEST INSERT (OPTIONAL, DEBUG) ================= */
exports.testInsertAttendance = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    await conn.execute(
      `
      INSERT INTO ALTIUS_DB.ATTENDANCE
      (ATTEND_ID, ATTEND_DATE, ATTEND_STATUS, STUDENT_ID, CLASS_ID)
      VALUES
      (
        ALTIUS_DB.ATTENDANCE_SEQ.NEXTVAL,
        DATE '2026-01-17',
        'Present',
        2,
        'C01'
      )
      `
    );

    await conn.commit();
    res.json({ message: "TEST INSERT OK" });

  } catch (e) {
    console.error("testInsertAttendance:", e);
    res.status(500).json(e.message);
  } finally {
    if (conn) await conn.close();
  }
};
