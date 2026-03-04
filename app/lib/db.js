// app/lib/db.js
import sql from "mssql";

export const dbConfig = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT || "1433"),
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
    enableArithAbort: process.env.DB_ENABLE_ARITH_ABORT === "true",
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || "30000"),
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || "30000"),
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || "10"),
    min: parseInt(process.env.DB_POOL_MIN || "0"),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || "30000"),
  },
};

export const VIEWS = {
  FREELANCERS: process.env.VIEW_FREELANCERS || "vwFreelancersListWEB2",
  FREELANCER_LINKS:
    process.env.VIEW_FREELANCER_LINKS || "vwFreelancerLinksWEB2",
  DEPARTMENTS_SKILLS:
    process.env.VIEW_DEPARTMENTS_SKILLS || "vwDepartmentsAndSkillsListWEB2",
  FREELANCER_SKILLS:
    process.env.VIEW_FREELANCER_SKILLS || "vwFreelancerSkillsListWEB2",
  SERVICES: process.env.VIEW_SERVICES || "vwServicesListWEB2",
  CATEGORIES: process.env.VIEW_CATEGORIES || "vwCategoriesListWEB2",
  SERVICE_CATEGORIES:
    process.env.VIEW_SERVICE_CATEGORIES || "vwServiceCategoriesListWEB2",
  STORED_DOCUMENTS:
    process.env.VIEW_STORED_DOCUMENTS || "vwStoredDocumentsListWEB2",
  NEWS_ITEMS: process.env.VIEW_NEWS_ITEMS || "vwNewsItemsListWEB2",
};

export const TABLES = {
  FREELANCER_WEBSITE_DATA:
    process.env.TABLE_FREELANCER_WEBSITE_DATA || "tblFreelancerWebsiteData",
  FREELANCER_WEBSITE_DATA_LINKS:
    process.env.TABLE_FREELANCER_WEBSITE_DATA_LINKS ||
    "tblFreelancerWebsiteDataLinks",
  STORED_DOCUMENTS: process.env.TABLE_STORED_DOCUMENTS || "tblStoredDocuments",
  NEWS_ITEMS: process.env.TABLE_NEWS_ITEMS || "tblNewsItems",
};

export const STATUS_CODES = {
  NONE: parseInt(process.env.STATUS_NONE || "0"),
  TO_BE_VERIFIED: parseInt(process.env.STATUS_TO_BE_VERIFIED || "1"),
  VERIFIED: parseInt(process.env.STATUS_VERIFIED || "2"),
  REJECTED: parseInt(process.env.STATUS_REJECTED || "3"),
};

export const STORED_DOCUMENT_TYPES = {
  SERVICE_COMPANY_LOGOS: 1,
  FREELANCER_PHOTOS: 2,
  FREELANCER_CVS: 3,
  NEWS_ITEMS: 4,
};

export const LINK_TYPES = {
  WEBSITE: process.env.LINK_TYPE_WEBSITE || "Website",
  INSTAGRAM: process.env.LINK_TYPE_INSTAGRAM || "Instagram",
  IMDB: process.env.LINK_TYPE_IMDB || "Imdb",
  LINKEDIN: process.env.LINK_TYPE_LINKEDIN || "LinkedIn",
};

export const SYSTEM_USER_ID = parseInt(process.env.SYSTEM_USER_ID || "1");

// Singleton pool + in-flight promise to prevent concurrent reconnection storms.
// Without poolPromise, every request that arrives while disconnected calls
// sql.connect() simultaneously — confirmed to cause 850-connection spikes.
let pool = null;
let poolPromise = null;

export async function getDbConnection() {
  // Fast path — existing healthy pool
  if (pool && pool.connected) return pool;

  // Serialise reconnection — if a connect() is already in flight, wait for it
  if (poolPromise) return poolPromise;

  poolPromise = sql
    .connect(dbConfig)
    .then((p) => {
      pool = p;
      poolPromise = null;

      // Reset state on any pool-level error so the next request triggers a
      // clean reconnect rather than trying to reuse a broken pool object
      pool.on("error", (err) => {
        console.error(
          "💥 SQL pool error — resetting for reconnect:",
          err.message,
        );
        pool = null;
        poolPromise = null;
      });

      return pool;
    })
    .catch((err) => {
      pool = null;
      poolPromise = null;
      throw err;
    });

  return poolPromise;
}

export async function executeQuery(query, params = {}) {
  try {
    const connection = await getDbConnection();
    const request = connection.request();

    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === "number") {
        request.input(key, sql.Int, value);
      } else if (typeof value === "boolean") {
        request.input(key, sql.Bit, value);
      } else {
        request.input(key, sql.NVarChar, value);
      }
    });

    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error("Query execution failed:", error);
    console.error("Query:", query);
    console.error("Params:", params);
    throw error;
  }
}

export async function executeUpdate(table, updates, where) {
  try {
    const connection = await getDbConnection();
    const request = connection.request();

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = @update${index}`)
      .join(", ");

    const whereClause = Object.keys(where)
      .map((key, index) => `${key} = @where${index}`)
      .join(" AND ");

    Object.entries(updates).forEach(([key, value], index) => {
      const paramName = `update${index}`;
      if (typeof value === "number") {
        request.input(paramName, sql.Int, value);
      } else if (typeof value === "boolean") {
        request.input(paramName, sql.Bit, value);
      } else if (value === null) {
        request.input(paramName, sql.NVarChar, null);
      } else if (
        value instanceof Date ||
        (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/))
      ) {
        request.input(paramName, sql.DateTime, value);
      } else {
        request.input(paramName, sql.NVarChar, value);
      }
    });

    Object.entries(where).forEach(([key, value], index) => {
      const paramName = `where${index}`;
      if (typeof value === "number") {
        request.input(paramName, sql.Int, value);
      } else {
        request.input(paramName, sql.NVarChar, value);
      }
    });

    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const result = await request.query(query);

    if (result.rowsAffected[0] === 0) {
      console.warn(`⚠️ No rows updated in ${table}`, { where });
    } else {
      console.log(`✅ Updated ${result.rowsAffected[0]} row(s) in ${table}`);
    }

    return result.rowsAffected[0];
  } catch (error) {
    console.error("Update failed:", error, { table, updates, where });
    throw error;
  }
}

export async function closeConnection() {
  if (pool) {
    try {
      await pool.close();
      pool = null;
    } catch (error) {
      console.error("Error closing connection:", error);
    }
  }
}

export async function testConnection() {
  try {
    const connection = await getDbConnection();
    const result = await connection.request().query("SELECT 1 as test");
    return result.recordset[0].test === 1;
  } catch (error) {
    console.error("Connection test failed:", error);
    return false;
  }
}
