const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const logger = require("../src/lib/logger");

dotenv.config();

const backupDir = process.env.BACKUP_DIR || path.join(__dirname, "..", "backups");
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS || 7);
const maxBackups = Number(process.env.BACKUP_MAX_FILES || 28);

function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function ensureBackupDirectory() {
  fs.mkdirSync(backupDir, { recursive: true });
}

function getPgEnv() {
  const useSsl = String(process.env.POSTGRES_SSL || "false").toLowerCase() === "true";

  return {
    ...process.env,
    PGHOST: process.env.PGHOST || process.env.POSTGRES_HOST,
    PGPORT: process.env.PGPORT || process.env.POSTGRES_PORT || "5432",
    PGUSER: process.env.PGUSER || process.env.POSTGRES_USER,
    PGPASSWORD: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD,
    PGDATABASE: process.env.PGDATABASE || process.env.POSTGRES_DB,
    PGSSLMODE: process.env.PGSSLMODE || (useSsl ? "require" : "disable"),
  };
}

function assertDatabaseEnv(env) {
  const missing = ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE"].filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Variaveis ausentes para backup: ${missing.join(", ")}`);
  }
}

function runPgDump(outputFilePath, env) {
  return new Promise((resolve, reject) => {
    const args = ["--no-owner", "--no-privileges", "--format=plain", "--file", outputFilePath, env.PGDATABASE];

    execFile("pg_dump", args, { env }, (error, _stdout, stderr) => {
      if (error) {
        const reason = stderr ? stderr.trim() : error.message;
        reject(new Error(`Falha ao executar pg_dump: ${reason}`));
        return;
      }
      resolve();
    });
  });
}

function pruneBackups() {
  const allFiles = fs
    .readdirSync(backupDir)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => {
      const filePath = path.join(backupDir, file);
      const stat = fs.statSync(filePath);
      return { file, filePath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const nowMs = Date.now();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

  for (const item of allFiles) {
    const tooOld = nowMs - item.mtimeMs > retentionMs;
    if (tooOld) {
      fs.unlinkSync(item.filePath);
    }
  }

  const remainingFiles = fs
    .readdirSync(backupDir)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => {
      const filePath = path.join(backupDir, file);
      const stat = fs.statSync(filePath);
      return { filePath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (remainingFiles.length > maxBackups) {
    const filesToDelete = remainingFiles.slice(maxBackups);
    for (const item of filesToDelete) {
      fs.unlinkSync(item.filePath);
    }
  }
}

async function createSnapshot() {
  ensureBackupDirectory();

  const env = getPgEnv();
  assertDatabaseEnv(env);

  const timestamp = formatTimestamp(new Date());
  const outputFilePath = path.join(backupDir, `snapshot-${timestamp}.sql`);

  await runPgDump(outputFilePath, env);
  pruneBackups();

  return outputFilePath;
}

createSnapshot()
  .then((filePath) => {
    logger.info({ entity: "backup", action: "create", filePath }, "Snapshot criado com sucesso");
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ err: error, entity: "backup", action: "create" }, "Erro ao criar snapshot");
    process.exit(1);
  });
