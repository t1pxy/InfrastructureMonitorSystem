import sql from "mssql";

const config: sql.config = {
  server: process.env.DB_SERVER || "localhost",
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME || "StarCat10",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  connectionTimeout: 10000,
  requestTimeout: 120000
}

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getDb(): Promise<sql.ConnectionPool> {
  if (poolPromise) return poolPromise;

  poolPromise = new sql.ConnectionPool(config).connect().then((pool) => {
    console.log("[MSSQL] Connected to database.");
    return pool
  }).catch((error) => {
    poolPromise = null;
    console.error("[MSSQL] Connection Failed: ", error);
    throw error;
  })
  return poolPromise;
}