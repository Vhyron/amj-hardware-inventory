export const categoriesSchema = `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`

export const categoriesSeed = [
  {
    id: '1',
    name: 'Raw Materials',
    description: 'Basic materials used in production',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Components',
    description: 'Parts and components for assembly',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Finished Goods',
    description: 'Completed products ready for sale',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Packaging',
    description: 'Materials used for product packaging',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Tools',
    description: 'Equipment and tools for manufacturing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '6',
    name: 'Office Supplies',
    description: 'Materials used in administrative operations',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '7',
    name: 'Maintenance',
    description: 'Items for facility and equipment maintenance',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '8',
    name: 'Safety Equipment',
    description: 'Personal protective and safety items',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]