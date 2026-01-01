import sql from "mssql";

/**
 * Azure SQL Database Configuration
 * Using read-only credentials for accessing web views
 * All values loaded from environment variables
 */
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

/**
 * View names for accessing the database (read-only)
 */
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
};

/**
 * Table names for updates (write operations)
 */
export const TABLES = {
  FREELANCER_WEBSITE_DATA:
    process.env.TABLE_FREELANCER_WEBSITE_DATA || "tblFreelancerWebsiteData",
  FREELANCER_WEBSITE_DATA_LINKS:
    process.env.TABLE_FREELANCER_WEBSITE_DATA_LINKS ||
    "tblFreelancerWebsiteDataLinks",
  STORED_DOCUMENTS: process.env.TABLE_STORED_DOCUMENTS || "tblStoredDocuments",
};

/**
 * Status codes for photos and CVs
 * 0 = None, 1 = To be verified, 2 = Verified, 3 = Rejected
 */
export const STATUS_CODES = {
  NONE: parseInt(process.env.STATUS_NONE || "0"),
  TO_BE_VERIFIED: parseInt(process.env.STATUS_TO_BE_VERIFIED || "1"),
  VERIFIED: parseInt(process.env.STATUS_VERIFIED || "2"),
  REJECTED: parseInt(process.env.STATUS_REJECTED || "3"),
};

/**
 * Document type IDs for stored documents
 */
export const DOCUMENT_TYPES = {
  PHOTO: parseInt(process.env.DOC_TYPE_PHOTO || "1"),
  CV: parseInt(process.env.DOC_TYPE_CV || "2"),
  EQUIPMENT_LIST: parseInt(process.env.DOC_TYPE_EQUIPMENT_LIST || "3"),
};

/**
 * Link types available for freelancers
 */
export const LINK_TYPES = {
  WEBSITE: process.env.LINK_TYPE_WEBSITE || "website",
  INSTAGRAM: process.env.LINK_TYPE_INSTAGRAM || "instagram",
  IMDB: process.env.LINK_TYPE_IMDB || "imdb",
  LINKEDIN: process.env.LINK_TYPE_LINKEDIN || "linked in", // Note: lowercase 'in' as per database
};

/**
 * System user ID for automated operations
 */
export const SYSTEM_USER_ID = parseInt(process.env.SYSTEM_USER_ID || "0");

// Global connection pool
let pool = null;

/**
 * Creates or returns existing connection pool to the database
 * Uses singleton pattern to reuse connections
 * @returns {Promise<sql.ConnectionPool>}
 */
export async function getDbConnection() {
  try {
    // Return existing pool if connected
    if (pool && pool.connected) {
      return pool;
    }

    // Create new pool if none exists or disconnected
    pool = await sql.connect(dbConfig);

    console.log("✅ Database connection established");
    return pool;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    throw error;
  }
}

/**
 * Executes a query and returns the results
 * Automatically handles connection pooling
 * @param {string} query - SQL query to execute
 * @param {Object} params - Parameters for the query (key-value pairs)
 * @returns {Promise<any>}
 */
export async function executeQuery(query, params = {}) {
  try {
    const connection = await getDbConnection();
    const request = connection.request();

    // Add parameters if any
    Object.entries(params).forEach(([key, value]) => {
      // Auto-detect SQL type based on JavaScript type
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
    console.error("❌ Query execution failed:", error);
    console.error("Query:", query);
    console.error("Params:", params);
    throw error;
  }
}

/**
 * Executes a stored procedure
 * @param {string} procedureName - Name of the stored procedure
 * @param {Object} params - Parameters for the procedure
 * @returns {Promise<any>}
 */
export async function executeProcedure(procedureName, params = {}) {
  try {
    const connection = await getDbConnection();
    const request = connection.request();

    // Add parameters
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === "number") {
        request.input(key, sql.Int, value);
      } else if (typeof value === "boolean") {
        request.input(key, sql.Bit, value);
      } else {
        request.input(key, sql.NVarChar, value);
      }
    });

    const result = await request.execute(procedureName);
    return result.recordset;
  } catch (error) {
    console.error("❌ Procedure execution failed:", error);
    console.error("Procedure:", procedureName);
    console.error("Params:", params);
    throw error;
  }
}

/**
 * Executes an UPDATE query
 * @param {string} table - Table name
 * @param {Object} updates - Fields to update (key-value pairs)
 * @param {Object} where - WHERE clause conditions (key-value pairs)
 * @returns {Promise<number>} Number of rows affected
 */
export async function executeUpdate(table, updates, where) {
  try {
    const connection = await getDbConnection();
    const request = connection.request();

    // Build SET clause
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = @update${index}`)
      .join(", ");

    // Build WHERE clause
    const whereClause = Object.keys(where)
      .map((key, index) => `${key} = @where${index}`)
      .join(" AND ");

    // Add update parameters
    Object.entries(updates).forEach(([key, value], index) => {
      if (typeof value === "number") {
        request.input(`update${index}`, sql.Int, value);
      } else if (typeof value === "boolean") {
        request.input(`update${index}`, sql.Bit, value);
      } else if (value === null) {
        request.input(`update${index}`, sql.NVarChar, null);
      } else {
        request.input(`update${index}`, sql.NVarChar, value);
      }
    });

    // Add where parameters
    Object.entries(where).forEach(([key, value], index) => {
      if (typeof value === "number") {
        request.input(`where${index}`, sql.Int, value);
      } else {
        request.input(`where${index}`, sql.NVarChar, value);
      }
    });

    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const result = await request.query(query);

    return result.rowsAffected[0];
  } catch (error) {
    console.error("❌ Update failed:", error);
    console.error("Table:", table);
    console.error("Updates:", updates);
    console.error("Where:", where);
    throw error;
  }
}

/**
 * Executes an INSERT query
 * @param {string} table - Table name
 * @param {Object} data - Data to insert (key-value pairs)
 * @returns {Promise<number>} Number of rows affected
 */
export async function executeInsert(table, data) {
  try {
    const connection = await getDbConnection();
    const request = connection.request();

    const columns = Object.keys(data).join(", ");
    const values = Object.keys(data)
      .map((_, index) => `@param${index}`)
      .join(", ");

    // Add parameters
    Object.entries(data).forEach(([key, value], index) => {
      if (typeof value === "number") {
        request.input(`param${index}`, sql.Int, value);
      } else if (typeof value === "boolean") {
        request.input(`param${index}`, sql.Bit, value);
      } else if (value === null) {
        request.input(`param${index}`, sql.NVarChar, null);
      } else {
        request.input(`param${index}`, sql.NVarChar, value);
      }
    });

    const query = `INSERT INTO ${table} (${columns}) VALUES (${values})`;
    const result = await request.query(query);

    return result.rowsAffected[0];
  } catch (error) {
    console.error("❌ Insert failed:", error);
    console.error("Table:", table);
    console.error("Data:", data);
    throw error;
  }
}

/**
 * Executes a DELETE query
 * @param {string} table - Table name
 * @param {Object} where - WHERE clause conditions (key-value pairs)
 * @returns {Promise<number>} Number of rows affected
 */
export async function executeDelete(table, where) {
  try {
    const connection = await getDbConnection();
    const request = connection.request();

    const whereClause = Object.keys(where)
      .map((key, index) => `${key} = @param${index}`)
      .join(" AND ");

    // Add parameters
    Object.entries(where).forEach(([key, value], index) => {
      if (typeof value === "number") {
        request.input(`param${index}`, sql.Int, value);
      } else {
        request.input(`param${index}`, sql.NVarChar, value);
      }
    });

    const query = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await request.query(query);

    return result.rowsAffected[0];
  } catch (error) {
    console.error("❌ Delete failed:", error);
    console.error("Table:", table);
    console.error("Where:", where);
    throw error;
  }
}

/**
 * Safely closes the database connection pool
 * Should be called when shutting down the application
 * @returns {Promise<void>}
 */
export async function closeConnection() {
  if (pool) {
    try {
      await pool.close();
      pool = null;
      console.log("✅ Database connection closed");
    } catch (error) {
      console.error("❌ Error closing connection:", error);
    }
  }
}

/**
 * Tests the database connection
 * @returns {Promise<boolean>}
 */
export async function testConnection() {
  try {
    const connection = await getDbConnection();
    const result = await connection.request().query("SELECT 1 as test");
    return result.recordset[0].test === 1;
  } catch (error) {
    console.error("❌ Connection test failed:", error);
    return false;
  }
}
