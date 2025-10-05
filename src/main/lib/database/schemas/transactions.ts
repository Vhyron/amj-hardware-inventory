export const transactionSchema = `
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    customerName TEXT, -- optional if not tracked
    referenceNo TEXT, -- optional external ref
    status TEXT NOT NULL, -- 'completed', 'cancelled', etc.
    totalAmount REAL NOT NULL DEFAULT 0,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`

export const transactionItemsSchema = `
  CREATE TABLE IF NOT EXISTS transactionItems (
    id TEXT PRIMARY KEY,
    transactionId TEXT NOT NULL,
    stockId TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unitPrice REAL NOT NULL,
    unit TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transactionId) REFERENCES transactions(id),
    FOREIGN KEY (stockId) REFERENCES stocks(id)
);
`
