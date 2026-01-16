const oracledb = require("oracledb");
const db = require("../db/db");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const clean = v =>
  v === undefined || v === null || v === "" ? null : v;

// =======================
// GET ALL
// =======================
exports.getAllStudents = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const r = await conn.execute(`
      SELECT 
        s.STUDENT_ID,
        s.STUDENT_NAME,
        s.STUDENT_IC,
        s.STUDENT_ADDRESS,
        s.STUDENT_EMAIL,
        s.STUDENT_PHONENUM,
        s.STUDENT_TYPE,

        p.STUDENT_YEAR,
        sec.STUDENT_FORM,
        sec.STREAM

      FROM STUDENT s
      LEFT JOIN PRIMARY_STUDENT p
        ON s.STUDENT_ID = p.STUDENT_ID
      LEFT JOIN SECONDARY_STUDENT sec
        ON s.STUDENT_ID = sec.STUDENT_ID
      ORDER BY s.STUDENT_ID
    `);

    res.json(r.rows);

  } catch (e) {
    console.error(e);
    res.status(500).json(e);
  } finally {
    if (conn) await conn.close();
  }
};


// =======================
// GET STUDENT BY ID 
// =======================
exports.getStudentById = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const r = await conn.execute(`
      SELECT 
        s.STUDENT_ID,
        s.STUDENT_NAME,
        s.STUDENT_IC,
        s.STUDENT_ADDRESS,
        s.STUDENT_EMAIL,
        s.STUDENT_PHONENUM,
        s.STUDENT_TYPE,

        p.STUDENT_YEAR,
        sec.STUDENT_FORM,
        sec.STREAM

      FROM STUDENT s
      LEFT JOIN PRIMARY_STUDENT p
        ON s.STUDENT_ID = p.STUDENT_ID
      LEFT JOIN SECONDARY_STUDENT sec
        ON s.STUDENT_ID = sec.STUDENT_ID
      WHERE s.STUDENT_ID = :id
    `, { id: req.params.id });

    if (r.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(r.rows[0]);

  } catch (e) {
    console.error(e);
    res.status(500).json(e);
  } finally {
    if (conn) await conn.close();
  }
};

// =======================
// ADD STUDENT + SUBTYPE
// =======================
exports.addStudent = async (req, res) => {
  let conn;

  try {
    conn = await oracledb.getConnection(db);

    // INSERT STUDENT
    const result = await conn.execute(
      `
      INSERT INTO STUDENT (
        STUDENT_ID,
        STUDENT_NAME,
        STUDENT_IC,
        STUDENT_ADDRESS,
        STUDENT_EMAIL,
        STUDENT_PHONENUM,
        STUDENT_TYPE
      )
      VALUES (
        student_seq.NEXTVAL,
        :name,
        :ic,
        :address,
        :email,
        :phone,
        :type
      )
      RETURNING STUDENT_ID INTO :id
      `,
      {
        name: clean(req.body.name),
        ic: clean(req.body.ic),
        address: clean(req.body.address),
        email: clean(req.body.email),
        phone: clean(req.body.phone),
        type: clean(req.body.type),
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    const studentId = result.outBinds.id[0];

    // INSERT SUBTYPE
    if (req.body.type === "Primary") {
      await conn.execute(
        `
        INSERT INTO PRIMARY_STUDENT (
          STUDENT_ID,
          STUDENT_YEAR
        )
        VALUES (
          :id,
          :year
        )
        `,
        {
          id: studentId,
          year: clean(req.body.year) || "Year 4"
        }
      );
    }

    if (req.body.type === "Secondary") {
      await conn.execute(
        `
        INSERT INTO SECONDARY_STUDENT (
          STUDENT_ID,
          STUDENT_FORM,
          STREAM
        )
        VALUES (
          :id,
          :form,
          :stream
        )
        `,
        {
          id: studentId,
          form: clean(req.body.form) || 1,
          stream: clean(req.body.stream) || "Science"
        }
      );
    }

    await conn.commit();
    res.json({ success: true, studentId });

  } catch (err) {
    if (conn) await conn.rollback();
    console.error(err);
    res.status(500).json(err);
  } finally {
    if (conn) await conn.close();
  }
};

// =======================
// UPDATE
// =======================
exports.updateStudent = async (req, res) => {
  let conn;

  try {
    conn = await oracledb.getConnection(db);

    // =========================
    // GET CURRENT STUDENT TYPE
    // =========================
    const current = await conn.execute(
      `SELECT STUDENT_TYPE FROM STUDENT WHERE STUDENT_ID = :id`,
      { id: req.params.id }
    );

    const oldType = current.rows[0].STUDENT_TYPE;
    const newType = req.body.type;

    // =========================
    // UPDATE STUDENT (SUPERTYPE)
    // =========================
    await conn.execute(
      `
      UPDATE STUDENT SET
        STUDENT_NAME = :name,
        STUDENT_IC = :ic,
        STUDENT_ADDRESS = :address,
        STUDENT_EMAIL = :email,
        STUDENT_PHONENUM = :phone,
        STUDENT_TYPE = :type
      WHERE STUDENT_ID = :id
      `,
      {
        id: req.params.id,
        name: clean(req.body.name),
        ic: clean(req.body.ic),
        address: clean(req.body.address),
        email: clean(req.body.email),
        phone: clean(req.body.phone),
        type: newType
      }
    );

    // =========================
    // IF TYPE CHANGED
    // =========================
    if (oldType !== newType) {
      await conn.execute(
        `DELETE FROM PRIMARY_STUDENT WHERE STUDENT_ID = :id`,
        { id: req.params.id }
      );
      await conn.execute(
        `DELETE FROM SECONDARY_STUDENT WHERE STUDENT_ID = :id`,
        { id: req.params.id }
      );
    }

    // =========================
    // UPDATE / INSERT SUBTYPE
    // =========================
    if (newType === "Primary") {
      await conn.execute(
        `
        MERGE INTO PRIMARY_STUDENT p
        USING dual
        ON (p.STUDENT_ID = :id)
        WHEN MATCHED THEN
          UPDATE SET STUDENT_YEAR = :year
        WHEN NOT MATCHED THEN
          INSERT (STUDENT_ID, STUDENT_YEAR)
          VALUES (:id, :year)
        `,
        {
          id: req.params.id,
          year: clean(req.body.year) || "Year 4"
        }
      );
    }

    if (newType === "Secondary") {
      await conn.execute(
        `
        MERGE INTO SECONDARY_STUDENT s
        USING dual
        ON (s.STUDENT_ID = :id)
        WHEN MATCHED THEN
          UPDATE SET STUDENT_FORM = :form, STREAM = :stream
        WHEN NOT MATCHED THEN
          INSERT (STUDENT_ID, STUDENT_FORM, STREAM)
          VALUES (:id, :form, :stream)
        `,
        {
          id: req.params.id,
          form: clean(req.body.form) || 1,
          stream: clean(req.body.stream) || "Science"
        }
      );
    }

    await conn.commit();
    res.json({ success: true });

  } catch (err) {
    if (conn) await conn.rollback();
    console.error(err);
    res.status(500).json(err);
  } finally {
    if (conn) await conn.close();
  }
};


// =======================
// DELETE
// =======================
exports.deleteStudent = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    // delete subtype first
    await conn.execute(
      "DELETE FROM PRIMARY_STUDENT WHERE STUDENT_ID = :id",
      { id: req.params.id }
    );
    await conn.execute(
      "DELETE FROM SECONDARY_STUDENT WHERE STUDENT_ID = :id",
      { id: req.params.id }
    );

    await conn.execute(
      "DELETE FROM STUDENT WHERE STUDENT_ID = :id",
      { id: req.params.id }
    );

    await conn.commit();
    res.json({ success: true });
  } catch (e) {
    if (conn) await conn.rollback();
    res.status(500).json(e);
  } finally {
    if (conn) await conn.close();
  }
};
