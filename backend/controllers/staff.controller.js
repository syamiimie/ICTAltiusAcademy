const oracledb = require("oracledb");
const db = require("../db/db");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

/* =========================
   GET STAFF BY ID
========================= */
exports.getStaffById = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);
    const result = await conn.execute(
      `SELECT * FROM STAFF WHERE STAFF_ID = :id`,
      { id: req.params.id }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Staff not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  } finally {
    if (conn) await conn.close();
  }
};

/* =========================
   ADD STAFF
========================= */
exports.addStaff = async (req, res) => {
  const { name, email, phone, username, password } = req.body;
  let conn;

  try {
    conn = await oracledb.getConnection(db);
    await conn.execute(
      `
      INSERT INTO STAFF
      (STAFF_ID, STAFF_NAME, STAFF_EMAIL, STAFF_PHONENUM, STAFF_USERNAME, STAFF_PASSWORD)
      VALUES (staff_seq.NEXTVAL, :name, :email, :phone, :username, :password)
      `,
      { name, email, phone, username, password },
      { autoCommit: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  } finally {
    if (conn) await conn.close();
  }
};

/* =========================
   UPDATE STAFF (SAFE)
========================= */
exports.updateStaff = async (req, res) => {
  const id = req.params.id;
  const { name, email, phone, username, password } = req.body;

  let conn;
  try {
    conn = await oracledb.getConnection(db);

    const fields = [];
    const params = { id };

    if (name) {
      fields.push("STAFF_NAME = :name");
      params.name = name;
    }

    if (email) {
      fields.push("STAFF_EMAIL = :email");
      params.email = email;
    }

    if (phone !== undefined) {
      fields.push("STAFF_PHONENUM = :phone");
      params.phone = phone;
    }

    if (username) {
      fields.push("STAFF_USERNAME = :username");
      params.username = username;
    }

    if (password) {
      fields.push("STAFF_PASSWORD = :password");
      params.password = password;
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No data to update" });
    }

    const sql = `
      UPDATE STAFF SET
      ${fields.join(", ")}
      WHERE STAFF_ID = :id
    `;

    const result = await conn.execute(sql, params, { autoCommit: true });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: "Staff not found" });
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  } finally {
    if (conn) await conn.close();
  }
};