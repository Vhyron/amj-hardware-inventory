export const suppliersSchema = `
  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    contactName TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    description TEXT,
    isActive INTEGER NOT NULL DEFAULT 1, -- 1 = active, 0 = inactive
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`

export const suppliersSeed = [
  {
    id: 'sup1',
    name: 'MetalWorks Inc',
    contactName: 'Carlos Dela Cruz',
    email: 'contact@metalworks.com',
    phone: '+63-912-345-6789',
    address: 'Cebu Industrial Park, Cebu City, PH',
    description: 'Specializes in metal components.',
    isActive: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sup2',
    name: 'ElectroParts Ltd',
    contactName: 'Anna Rivera',
    email: 'sales@electroparts.ph',
    phone: '+63-915-111-2233',
    address: 'Unit 502, Makati Tech Center, Makati City, PH',
    description: 'Supplies all electrical components.',
    isActive: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sup3',
    name: 'DisplayTech',
    contactName: 'Michael Go',
    email: 'support@displaytech.ph',
    phone: '+63-917-888-9990',
    address: 'Ortigas Business District, Pasig City, PH',
    description: 'Display solutions for industrial use.',
    isActive: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sup4',
    name: 'GasketMakers Co',
    contactName: 'Isabel Santos',
    email: 'info@gasketmakers.ph',
    phone: '+63-918-555-7777',
    address: '123 Industrial Ave, Mandaue City, PH',
    description: 'Specialized in rubber and plastic gaskets and seals.',
    isActive: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sup5',
    name: 'CopperTech Industries',
    contactName: 'Roberto Tan',
    email: 'sales@coppertech.ph',
    phone: '+63-919-222-3344',
    address: '55 Manufacturing Road, Davao City, PH',
    description: 'Suppliers of copper materials and wiring solutions.',
    isActive: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]
