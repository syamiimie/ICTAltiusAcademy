const oracledb = require("oracledb");
const db = require("../db/db");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

/* GET ALL */
exports.getAllTeachers = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);
    const r = await conn.execute(
      `SELECT * FROM TEACHER ORDER BY TEACHER_ID`
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json(e);
  } finally {
    if (conn) await conn.close();
  }
};

/* GET BY ID */
exports.getTeacherById = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);
    const r = await conn.execute(
      `SELECT * FROM TEACHER WHERE TEACHER_ID = :id`,
      { id: req.params.id }
    );
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json(e);
  } finally {
    if (conn) await conn.close();
  }
};

/* ADD */
exports.addTeacher = async (req, res) => {
  const clean = v => v === "" ? null : v;
  const { name, ic, email, phone, address } = req.body;

  let conn;
  try {
    conn = await oracledb.getConnection(db);
    await conn.execute(
      `
      INSERT INTO TEACHER (
        TEACHER_ID,
        TEACHER_NAME,
        TEACHER_IC,
        TEACHER_EMAIL,
        TEACHER_PHONENUM,
        TEACHER_ADDRESS
      )
      VALUES (
        teacher_seq.NEXTVAL,
        :name, :ic, :email, :phone, :address
      )
      `,
      {
        name: clean(name),
        ic: clean(ic),
        email: clean(email),
        phone: clean(phone),
        address: clean(address)
      },
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json(e);
  } finally {
    if (conn) await conn.close();
  }
};

/* UPDATE */
exports.updateTeacher = async (req, res) => {
  const id = req.params.id;
  const clean = v => v === "" ? null : v;
  const { name, ic, email, phone, address } = req.body;

  let conn;
  try {
    conn = await oracledb.getConnection(db);
    await conn.execute(
      `
      UPDATE TEACHER SET
        TEACHER_NAME = COALESCE(:name, TEACHER_NAME),
        TEACHER_IC = COALESCE(:ic, TEACHER_IC),
        TEACHER_EMAIL = COALESCE(:email, TEACHER_EMAIL),
        TEACHER_PHONENUM = COALESCE(:phone, TEACHER_PHONENUM),
        TEACHER_ADDRESS = COALESCE(:address, TEACHER_ADDRESS)
      WHERE TEACHER_ID = :id
      `,
      {
        id,
        name: clean(name),
        ic: clean(ic),
        email: clean(email),
        phone: clean(phone),
        address: clean(address)
      },
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json(e);
  } finally {
    if (conn) await conn.close();
  }
};

/* DELETE */
exports.deleteTeacher = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);
    await conn.execute(
      `DELETE FROM TEACHER WHERE TEACHER_ID = :id`,
      { id: req.params.id },
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json(e);
  } finally {
    if (conn) await conn.close();
  }
};
