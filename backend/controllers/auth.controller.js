const oracledb = require("oracledb");
const db = require("../db/db");

/**
 * Staff Login
 */
exports.login = async (req, res) => {
  let conn;
  const { username, password } = req.body;

  try {
    conn = await oracledb.getConnection(db);

    const result = await conn.execute(
      `SELECT STAFF_ID, STAFF_NAME, STAFF_EMAIL
       FROM STAFF
       WHERE STAFF_USERNAME = :username
       AND STAFF_PASSWORD = :password`,
      { username, password }
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid login" });
    }

    res.json({
      success: true,
      staff: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  } finally {
    if (conn) await conn.close();
  }
};
