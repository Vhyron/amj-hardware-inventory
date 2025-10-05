export const supplyOrdersSchema = `
  CREATE TABLE IF NOT EXISTS supplyOrders (
    id TEXT PRIMARY KEY,
    supplierId TEXT NOT NULL REFERENCES suppliers(id),
    orderedBy TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Approved, Delivered, Cancelled
    totalCost REAL NOT NULL,
    notes TEXT,
    deliveredAt TEXT, -- nullable, set only when status is Delivered
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`

export const supplyOrderItemsSchema = `
  CREATE TABLE IF NOT EXISTS orderItems (
    id TEXT PRIMARY KEY,
    orderId TEXT NOT NULL,
    stockId TEXT, -- optional, null for new item
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    description TEXT,
    category TEXT,
    quantity INTEGER NOT NULL,
    unit TEXT NOT NULL,
    unitPrice REAL NOT NULL, -- price YOU pay per unit
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES supplyOrders(id),
    FOREIGN KEY (stockId) REFERENCES stocks(id)
)
`
