const oracledb = require("oracledb");
const db = require("../db/db");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// ===============================
// GET ALL SUBJECTS
// ===============================
exports.getAllSubjects = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const r = await conn.execute(`
      SELECT
        s.SUBJECT_ID,
        s.SUBJECT_NAME,
        s.PACKAGE_ID,
        p.PACKAGE_NAME
      FROM SUBJECT s
      LEFT JOIN PACKAGE p
        ON s.PACKAGE_ID = p.PACKAGE_ID
      ORDER BY p.PACKAGE_NAME, s.SUBJECT_NAME
    `);

    res.json(r.rows);

  } catch (e) {
    console.error("Get All Subjects Error:", e);
    res.status(500).json({ message: "Failed to load subjects" });
  } finally {
    if (conn) await conn.close();
  }
};

// ===============================
// GET SUBJECT BY ID
// ===============================
exports.getSubjectById = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const r = await conn.execute(
      `SELECT * FROM SUBJECT WHERE SUBJECT_ID = :id`,
      { id: Number(req.params.id) }
    );

    res.json(r.rows[0]);

  } catch (e) {
    console.error("Get Subject By ID Error:", e);
    res.status(500).json({ message: "Failed to load subject" });
  } finally {
    if (conn) await conn.close();
  }
};

// ===============================
// ADD SUBJECT  ✅ FIXED
// ===============================
exports.addSubject = async (req, res) => {
  const { subject_name, package_id } = req.body;

  // 🔐 Validation
  if (!subject_name || !package_id) {
    return res.status(400).json({
      message: "Subject name and package are required"
    });
  }

  let conn;
  try {
    conn = await oracledb.getConnection(db);

    await conn.execute(
      `
      INSERT INTO SUBJECT (
        SUBJECT_ID,
        SUBJECT_NAME,
        PACKAGE_ID
      )
      VALUES (
        subject_seq.NEXTVAL,
        :subject_name,
        :package_id
      )
      `,
      {
        subject_name: subject_name.trim(),
        package_id: Number(package_id)
      },
      { autoCommit: true }
    );

    res.json({ success: true });

  } catch (e) {
    console.error("Add Subject Error:", e);

    // 🧠 Friendly Oracle errors
    let msg = "Failed to add subject";

    if (e.errorNum === 1) {
      msg = "Subject name already exists";
    } else if (e.errorNum === 2291) {
      msg = "Invalid package selected";
    }

    res.status(500).json({
      message: msg,
      oracleError: e.message
    });

  } finally {
    if (conn) await conn.close();
  }
};

// ===============================
// UPDATE SUBJECT
// ===============================
exports.updateSubject = async (req, res) => {
  const id = Number(req.params.id);
  const { subject_name, package_id } = req.body;

  if (!subject_name || !package_id) {
    return res.status(400).json({
      message: "Subject name and package are required"
    });
  }

  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const result = await conn.execute(
      `
      UPDATE SUBJECT
      SET SUBJECT_NAME = :subject_name,
          PACKAGE_ID = :package_id
      WHERE SUBJECT_ID = :id
      `,
      {
        id,
        subject_name: subject_name.trim(),
        package_id: Number(package_id)
      },
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.json({ success: true });

  } catch (e) {
    console.error("Update Subject Error:", e);
    res.status(500).json({ message: "Failed to update subject" });
  } finally {
    if (conn) await conn.close();
  }
};

// ===============================
// DELETE SUBJECT
// ===============================
exports.deleteSubject = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    await conn.execute(
      `DELETE FROM SUBJECT WHERE SUBJECT_ID = :id`,
      { id: Number(req.params.id) },
      { autoCommit: true }
    );

    res.json({ success: true });

  } catch (e) {
    console.error("Delete Subject Error:", e);
    res.status(500).json({ message: "Failed to delete subject" });
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= GET SUBJECTS BY PACKAGE ================= */
exports.getSubjectsByPackage = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const r = await conn.execute(
      `SELECT
         SUBJECT_ID,
         SUBJECT_NAME
       FROM SUBJECT
       WHERE PACKAGE_ID = :id
       ORDER BY SUBJECT_NAME`,
      { id: Number(req.params.id) }
    );

    res.json(r.rows);

  } catch (e) {
    console.error("Get Subjects By Package Error:", e);
    res.status(500).json({ message: "Failed to load subjects" });
  } finally {
    if (conn) await conn.close();
  }
};

