const oracledb = require("oracledb");
const db = require("../db/db");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

/* ================= GET ALL ENROLLMENTS ================= */
exports.getAllEnrollments = async (req, res) => {
  let conn;

  try {
    conn = await oracledb.getConnection(db);

    const result = await conn.execute(`
SELECT
  e.Enroll_ID,
  e.Student_ID,
  e.Package_ID,
  e.Enroll_Date,
  e.Enroll_Status,

  s.Student_Name,

  p.Package_Name,

  sub.Subject_Name,

  c.Class_ID,
  c.Class_Name,
  c.Class_Day,
  c.Class_Time,

  t.Teacher_Name,

  NVL(pay.Total_Fees, 0) AS Total_Fees_Paid
FROM ALTIUS_DB.Enrollment e
JOIN ALTIUS_DB.Student s 
  ON e.Student_ID = s.Student_ID

LEFT JOIN ALTIUS_DB.Package p 
  ON e.Package_ID = p.Package_ID

LEFT JOIN ALTIUS_DB.Subject sub 
  ON p.Package_ID = sub.Package_ID

LEFT JOIN ALTIUS_DB.Class c 
  ON sub.Subject_ID = c.Subject_ID

LEFT JOIN ALTIUS_DB.Teacher t 
  ON c.Teacher_ID = t.Teacher_ID

LEFT JOIN ALTIUS_DB.Payment pay 
  ON e.Payment_ID = pay.Payment_ID

ORDER BY e.Enroll_ID DESC

    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching enrollments");
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= ADD ENROLLMENT ================= */
exports.addEnrollment = async (req, res) => {
  const { Student_ID, Package_ID, Enroll_Status } = req.body;
  let conn;

  try {
    conn = await oracledb.getConnection(db);

    /* 1️⃣ Check student & package exist */
    const checkBase = await conn.execute(
      `
      SELECT
        (SELECT COUNT(*) FROM ALTIUS_DB.Student WHERE Student_ID = :Student_ID) AS STUDENT_CNT,
        (SELECT COUNT(*) FROM ALTIUS_DB.Package WHERE Package_ID = :Package_ID) AS PACKAGE_CNT
      FROM DUAL
      `,
      { Student_ID, Package_ID }
    );

    const { STUDENT_CNT, PACKAGE_CNT } = checkBase.rows[0];

    if (STUDENT_CNT === 0 || PACKAGE_CNT === 0) {
      return res.status(400).send("Invalid student or package selected");
    }

    /* 2️⃣ Prevent duplicate enrollment */
    const dupCheck = await conn.execute(
      `
      SELECT COUNT(*) AS CNT
      FROM ALTIUS_DB.Enrollment
      WHERE Student_ID = :Student_ID
        AND Package_ID = :Package_ID
      `,
      { Student_ID, Package_ID }
    );

    if (dupCheck.rows[0].CNT > 0) {
      return res.status(409).send(
        "Student is already enrolled in this package"
      );
    }

    /* 3️⃣ Get package details (level + subject) */
    const pkgInfo = await conn.execute(
      `
      SELECT PACKAGE_NAME
      FROM ALTIUS_DB.Package
      WHERE Package_ID = :Package_ID
      `,
      { Package_ID }
    );

    const packageName = pkgInfo.rows[0].PACKAGE_NAME;
    const isAdvanced = packageName.startsWith("Advanced");

    /* Extract subject from package name (e.g. "Advanced Biology") */
    let advancedSubject = null;
    if (isAdvanced) {
      advancedSubject = packageName.replace("Advanced", "").trim();
    }

    /* 4️⃣ If Advanced → must have SAME subject F4 & F5 */
    if (isAdvanced) {
      const f45Check = await conn.execute(
        `
        SELECT COUNT(DISTINCT s.SUBJECT_NAME) AS CNT
        FROM ALTIUS_DB.Enrollment e
        JOIN ALTIUS_DB.Subject s
          ON e.Package_ID = s.Package_ID
        WHERE e.Student_ID = :Student_ID
          AND (
            s.SUBJECT_NAME = :SUBJECT || ' F4'
            OR s.SUBJECT_NAME = :SUBJECT || ' F5'
          )
        HAVING COUNT(DISTINCT s.SUBJECT_NAME) = 2
        `,
        {
          Student_ID,
          SUBJECT: advancedSubject
        }
      );

      if (f45Check.rows.length === 0) {
        return res.status(403).send(
          `Student must be enrolled in BOTH ${advancedSubject} Form 4 and Form 5 before enrolling in Advanced ${advancedSubject}`
        );
      }
    }

    /* 5️⃣ Insert enrollment */
    await conn.execute(
      `
      INSERT INTO ALTIUS_DB.Enrollment
        (Enroll_ID, Student_ID, Package_ID, Enroll_Status)
      VALUES
        (ALTIUS_DB.Enroll_SEQ.NEXTVAL, :Student_ID, :Package_ID, :Enroll_Status)
      `,
      { Student_ID, Package_ID, Enroll_Status },
      { autoCommit: true }
    );

    res.status(201).send("Enrollment added successfully");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding enrollment");
  } finally {
    if (conn) await conn.close();
  }
};


/* ================= UPDATE ENROLLMENT ================= */
exports.updateEnrollment = async (req, res) => {
  const { id } = req.params;
  const { Package_ID, Enroll_Status } = req.body;
  let conn;

  try {
    conn = await oracledb.getConnection(db);

    const result = await conn.execute(
      `
      UPDATE ALTIUS_DB.Enrollment
      SET
        Package_ID = :Package_ID,
        Enroll_Status = :Enroll_Status
      WHERE Enroll_ID = :id
      `,
      [Package_ID, Enroll_Status, id],
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).send("Enrollment not found");
    }

    res.send("Enrollment updated successfully");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating enrollment");
  } finally {
    if (conn) await conn.close();
  }
};

/* ================= DELETE ENROLLMENT ================= */
exports.deleteEnrollment = async (req, res) => {
  const { id } = req.params;
  let conn;

  try {
    conn = await oracledb.getConnection(db);

    const result = await conn.execute(
      `DELETE FROM ALTIUS_DB.Enrollment WHERE Enroll_ID = :id`,
      [id],
      { autoCommit: true }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).send("Enrollment not found");
    }

    res.send("Enrollment deleted successfully");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting enrollment");
  } finally {
    if (conn) await conn.close();
  }
};
