const oracledb = require("oracledb");
const db = require("../db/db");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

/* ================= GET ALL CLASSES ================= */
exports.getAllClasses = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);
    const r = await conn.execute(
      `SELECT * FROM CLASS ORDER BY CLASS_ID`
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json(e);
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= GET CLASS BY ID ================= */
exports.getClassById = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const r = await conn.execute(
      `SELECT
         CLASS_ID,
         CLASS_NAME,
         CLASS_TIME,
         CLASS_DAY,
         SUBJECT_ID,
         TEACHER_ID
       FROM CLASS
       WHERE CLASS_ID = :id`,
      { id: req.params.id }
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ message: "Class not found" });
    }

    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ message: e.message });
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= ADD CLASS (FIXED) ================= */
exports.addClass = async (req, res) => {
  let conn;
  const { name, time, day, subject_id, teacher_id, prerequisites = [] } = req.body;

  try {
    conn = await oracledb.getConnection(db);

    /* 1️⃣ Insert class + get CLASS_ID safely */
    const result = await conn.execute(
      `
      INSERT INTO ALTIUS_DB.CLASS (
        CLASS_ID, CLASS_NAME, CLASS_TIME, CLASS_DAY, SUBJECT_ID, TEACHER_ID
      )
      VALUES (
        'C' || ALTIUS_DB.CLASS_SEQ.NEXTVAL,
        :name, :time, :day, :subject_id, :teacher_id
      )
      RETURNING CLASS_ID INTO :classId
      `,
      {
        name,
        time,
        day,
        subject_id,
        teacher_id,
        classId: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
      }
    );

    const classId = result.outBinds.classId[0];

    /* 2️⃣ Insert prerequisites */
    for (let prereqId of prerequisites) {
      if (prereqId === classId)
        throw new Error("Class cannot be its own prerequisite");

      await conn.execute(
        `
        INSERT INTO ALTIUS_DB.CLASS_PREREQUISITE (
          PREREQUISITE_ID, CLASS_ID, PREREQUISITE_CLASS_ID
        )
        VALUES (
          ALTIUS_DB.PREREQ_SEQ.NEXTVAL,
          :class_id,
          :prereq_id
        )
        `,
        { class_id: classId, prereq_id: prereqId }
      );
    }

    await conn.commit();

    res.status(201).json({
      message: "Class and prerequisites added successfully",
      classId
    });

  } catch (e) {
    if (conn) await conn.rollback();
    console.error(e);
    res.status(400).json({ message: e.message });
  } finally {
    if (conn) await conn.close();
  }
};


/* ================= ADD PREREQUISITE TO EXISTING CLASS ================= */
exports.addPrerequisite = async (req, res) => {
    let conn;
    const classId = req.params.id;
    const { prerequisite_class_id } = req.body;

    try {
        conn = await oracledb.getConnection(db);

        // Prevent adding itself as prerequisite
        if (classId === prerequisite_class_id) {
            return res.status(400).json({ message: "Class cannot be its own prerequisite" });
        }

        // Check if prerequisite class exists
        const check = await conn.execute(
            `SELECT COUNT(*) AS CNT FROM CLASS WHERE CLASS_ID = :id`,
            { id: prerequisite_class_id }
        );

        if (check.rows[0].CNT === 0) {
            return res.status(404).json({ message: "Prerequisite class not found" });
        }

        // Insert into CLASS_PREREQUISITE
        await conn.execute(
            `INSERT INTO CLASS_PREREQUISITE (PREREQUISITE_ID, CLASS_ID, PREREQUISITE_CLASS_ID)
             VALUES (ALTIUS_DB.PREREQ_SEQ.NEXTVAL, :classId, :prereqId)`,
            { classId, prereqId: prerequisite_class_id },
            { autoCommit: true }
        );

        res.status(201).json({ message: "Prerequisite added successfully" });
    } catch (e) {
        if (conn) await conn.rollback();
        res.status(500).json({ message: e.message });
    } finally {
        if (conn) await conn.close();
    }
};

/* ================= DELETE CLASS ================= */
exports.deleteClass = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    // Delete all prerequisites first
    await conn.execute(
      `DELETE FROM CLASS_PREREQUISITE WHERE CLASS_ID = :id`,
      [req.params.id]
    );

    // Delete class
    await conn.execute(
      `DELETE FROM CLASS WHERE CLASS_ID = :id`,
      [req.params.id]
    );

    await conn.commit();
    res.json({ message: "Class deleted successfully" });
  } catch (e) {
    if (conn) await conn.rollback();
    res.status(500).json({ message: e.message });
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= CLASS LIST WITH PREREQS ================= */
exports.getClassListWithPrereq = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const r = await conn.execute(`
      SELECT
        c.CLASS_ID,
        c.CLASS_NAME,
        c.CLASS_TIME,
        c.CLASS_DAY,
        s.SUBJECT_NAME,
        p.PACKAGE_NAME,
        t.TEACHER_NAME,
        LISTAGG(cp2.CLASS_ID, ', ')
          WITHIN GROUP (ORDER BY cp2.CLASS_ID) AS PREREQUISITES
      FROM CLASS c
      JOIN SUBJECT s
        ON c.SUBJECT_ID = s.SUBJECT_ID
      JOIN PACKAGE p
        ON s.PACKAGE_ID = p.PACKAGE_ID
      JOIN TEACHER t
        ON c.TEACHER_ID = t.TEACHER_ID
      LEFT JOIN CLASS_PREREQUISITE cp
        ON c.CLASS_ID = cp.CLASS_ID
      LEFT JOIN CLASS cp2
        ON cp.PREREQUISITE_CLASS_ID = cp2.CLASS_ID
      GROUP BY
        c.CLASS_ID,
        c.CLASS_NAME,
        c.CLASS_TIME,
        c.CLASS_DAY,
        s.SUBJECT_NAME,
        p.PACKAGE_NAME,
        t.TEACHER_NAME
      ORDER BY c.CLASS_ID
    `);

    res.json(r.rows);

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load classes" });
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= GET PREREQUISITES FOR A CLASS ================= */
exports.getClassPrerequisites = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const r = await conn.execute(
      `SELECT
         cp.PREREQUISITE_ID,
         c.CLASS_ID,
         c.CLASS_NAME
       FROM CLASS_PREREQUISITE cp
       JOIN CLASS c
         ON cp.PREREQUISITE_CLASS_ID = c.CLASS_ID
       WHERE cp.CLASS_ID = :id
       ORDER BY c.CLASS_ID`,
      { id: req.params.id }
    );

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ message: e.message });
  } finally {
    if (conn) await conn.close();
  }
};

exports.updateClass = async (req, res) => {
    let conn;
    const id = req.params.id;
    const { name, time, day, subject_id, teacher_id, prerequisites = [] } = req.body;

    try {
        conn = await oracledb.getConnection(db);

        // Update main class
        await conn.execute(
            `UPDATE CLASS
             SET CLASS_NAME = :name,
                 CLASS_TIME = :time,
                 CLASS_DAY = :day,
                 SUBJECT_ID = :subject_id,
                 TEACHER_ID = :teacher_id
             WHERE CLASS_ID = :id`,
            { name, time, day, subject_id, teacher_id, id },
        );

        // Delete all old prerequisites
        await conn.execute(
            `DELETE FROM CLASS_PREREQUISITE WHERE CLASS_ID = :id`,
            [id]
        );

        // Add new prerequisites
        for (let prereqId of prerequisites) {
            if (prereqId === id) throw new Error("Class cannot be its own prerequisite");
            await conn.execute(
                `INSERT INTO CLASS_PREREQUISITE (PREREQUISITE_ID, CLASS_ID, PREREQUISITE_CLASS_ID)
                 VALUES (ALTIUS_DB.PREREQ_SEQ.NEXTVAL, :id, :prereqId)`,
                { id, prereqId }
            );
        }

        await conn.commit();
        res.json({ message: "Class updated successfully" });

    } catch (e) {
        if (conn) await conn.rollback();
        res.status(400).json({ message: e.message });
    } finally {
        if (conn) await conn.close();
    }
};

exports.deletePrerequisite = async (req, res) => {
    let conn;
    try {
        conn = await oracledb.getConnection(db);

        await conn.execute(
            `DELETE FROM CLASS_PREREQUISITE WHERE PREREQUISITE_ID = :id`,
            [req.params.prerequisite_id],
            { autoCommit: true }
        );

        res.json({ message: "Prerequisite removed" });
    } catch (e) {
        res.status(500).json({ message: e.message });
    } finally {
        if (conn) await conn.close();
    }
};

/* ================= CLASS SCHEDULE ================= */
exports.getClassSchedule = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const r = await conn.execute(`
      SELECT *
      FROM CLASS_SCHEDULE_VIEW
      ORDER BY CLASS_DAY, CLASS_TIME
    `);

    res.json(r.rows);

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to load class schedule" });
  } finally {
    if (conn) await conn.close();
  }
};



