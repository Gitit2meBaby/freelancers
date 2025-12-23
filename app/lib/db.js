import sql from "mssql";

/**
 * Azure SQL Database Configuration
 * Using read-only credentials for accessing web views
 */
export const dbConfig = {
  server: "fps01.database.windows.net",
  port: 1433,
  database: "fpsdb01",
  user: "webdeveloper2",
  password: "lS946TibYK4A7zKQy63t",
  options: {
    encrypt: true, // Azure requires encryption
    trustServerCertificate: false,
    enableArithAbort: true,
    connectionTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

/**
 * View names for accessing the database
 */
export const VIEWS = {
  FREELANCERS: "vwFreelancersListWEB2",
  FREELANCER_LINKS: "vwFreelancerLinksWEB2",
  DEPARTMENTS_SKILLS: "vwDepartmentsAndSkillsListWEB2",
  FREELANCER_SKILLS: "vwFreelancerSkillsListWEB2",
};

/**
 * Status codes for photos and CVs
 */
export const STATUS_CODES = {
  NONE: 0,
  TO_BE_VERIFIED: 1,
  VERIFIED: 2,
  REJECTED: 3,
};

/**
 * Link types available for freelancers
 */
export const LINK_TYPES = {
  WEBSITE: "website",
  INSTAGRAM: "instagram",
  IMDB: "imdb",
  LINKEDIN: "linked in", // Note: lowercase 'in' as per database
};

/**
 * Creates a connection pool to the database
 * @returns {Promise<sql.ConnectionPool>}
 */
export async function getDbConnection() {
  try {
    const pool = await sql.connect(dbConfig);
    return pool;
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}

/**
 * Executes a query and returns the results
 * @param {string} query - SQL query to execute
 * @param {Object} params - Parameters for the query
 * @returns {Promise<any>}
 */
export async function executeQuery(query, params = {}) {
  let pool;
  try {
    pool = await getDbConnection();
    const request = pool.request();

    // Add parameters if any
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });

    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error("Query execution failed:", error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

/**
 * Safely closes a database connection
 * @param {sql.ConnectionPool} pool
 */
export async function closeConnection(pool) {
  if (pool) {
    try {
      await pool.close();
    } catch (error) {
      console.error("Error closing connection:", error);
    }
  }
}
