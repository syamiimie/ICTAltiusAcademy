const oracledb = require("oracledb");
const db = require("../db/db");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// GET ALL PACKAGES
exports.getAllPackages = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);
    const r = await conn.execute(
      `SELECT * FROM "PACKAGE" ORDER BY PACKAGE_NAME`
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json(e);
  } finally {
    if (conn) await conn.close();
  }
};

// GET PACKAGE BY ID
exports.getPackageById = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);
    const r = await conn.execute(
      `SELECT *
       FROM "PACKAGE"
       WHERE PACKAGE_ID = :id`,
      { id: req.params.id }
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ message: "Package not found" });
    }

    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json(e);
  } finally {
    if (conn) await conn.close();
  }
};

// ✅ ADD PACKAGE (THIS IS WHAT YOU NEED)
exports.addPackage = async (req, res) => {
  const { name, fee, duration } = req.body;

  console.log("REQ BODY:", req.body); // 👈 DEBUG LOG

  let conn;
  try {
    conn = await oracledb.getConnection(db);
    await conn.execute(
      `
      INSERT INTO "PACKAGE" (
        PACKAGE_ID,
        PACKAGE_NAME,
        PACKAGE_FEE,
        DURATION
      )
      VALUES (
        package_seq.NEXTVAL,
        :name,
        :fee,
        :duration
      )
      `,
      { name, fee, duration },
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json(e);
  } finally {
    if (conn) await conn.close();
  }
};

// UPDATE PACKAGE
exports.updatePackage = async (req, res) => {
  const { name, fee, duration } = req.body;

  let conn;
  try {
    conn = await oracledb.getConnection(db);
    await conn.execute(
      `
      UPDATE "PACKAGE" SET
        PACKAGE_NAME = :name,
        PACKAGE_FEE = :fee,
        DURATION = :duration
      WHERE PACKAGE_ID = :id
      `,
      {
        id: req.params.id,
        name,
        fee,
        duration
      },
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json(e);
  } finally {
    if (conn) await conn.close();
  }
};

// DELETE PACKAGE
exports.deletePackage = async (req, res) => {
  let conn;
  try {
    conn = await oracledb.getConnection(db);
    await conn.execute(
      `DELETE FROM "PACKAGE" WHERE PACKAGE_ID = :id`,
      { id: req.params.id },
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json(e);
  } finally {
    if (conn) await conn.close();
  }
};
