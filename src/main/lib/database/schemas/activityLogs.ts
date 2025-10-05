export const activityLogsSchema = `
  CREATE TABLE IF NOT EXISTS activityLogs (
    id TEXT PRIMARY KEY ,
    userId TEXT NOT NULL,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    entityType TEXT NOT NULL,
    entityId TEXT NOT NULL,
    details TEXT,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );
`
