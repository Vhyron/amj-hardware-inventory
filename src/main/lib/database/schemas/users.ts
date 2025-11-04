import { generatePrefixedUUID } from '../utils/uuid.ts'

export const usersSchema = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    permissions TEXT NOT NULL,
    profile_image TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`

export const usersSeeds = [
  {
    id: generatePrefixedUUID('usr'),
    name: 'Admin',
    username: 'admin',
    password: 'admin123',
    role: 'super_admin',
    permissions: JSON.stringify(['*'])
  },
  {
    id: generatePrefixedUUID('usr'),
    name: 'Admin Two',
    username: 'admin2',
    password: 'admin2123',
    role: 'admin',
    permissions: JSON.stringify(['*'])
  },
  {
    id: generatePrefixedUUID('usr'),
    name: 'Manager One',
    username: 'secretary',
    password: 'secretary123',
    role: 'secretary',
    permissions: JSON.stringify([
      'stocks:view', 
      'stocks:edit', 
      'categories:view', 
      'users:view'
    ])
  },
  {
    id: generatePrefixedUUID('usr'),
    name: 'Staff One',
    username: 'staff',
    password: 'staff123',
    role: 'staff',
    permissions: JSON.stringify(['stocks:view'])
  },
]
