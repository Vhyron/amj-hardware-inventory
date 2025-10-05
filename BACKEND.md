# Backend Architecture Documentation

## Overview

This Electron application uses a well-structured backend architecture that separates concerns into distinct layers: **Database**, **Repository**, **Service**, and **IPC Communication**. This design follows the Repository Pattern and Service Layer Pattern to ensure maintainable, testable, and scalable code.

## Database Layer

### Database Manager (`src/main/lib/database/database.ts`)

The application uses **SQLite** via the `better-sqlite3` library as the primary database. The `DatabaseManager` class implements the **Singleton Pattern** to ensure only one database connection exists throughout the application lifecycle.

**Key Features:**
- **Singleton Pattern**: Ensures only one database instance
- **Automatic Database Creation**: Creates the database file in the user's data directory
- **Foreign Key Support**: Enables foreign key constraints with `PRAGMA foreign_keys = ON`
- **Table Initialization**: Automatically creates all required tables on first run
- **Data Seeding**: Optionally seeds initial data for development

**Database Location:**
- **Windows**: `%APPDATA%/fagan-inventory/inventory.db`
- **Linux**: `~/.config/fagan-inventory/inventory.db`
- **macOS**: `~/Library/Application Support/fagan-inventory/inventory.db`

### Schema Manager (`src/main/lib/database/schemaManager.ts`)

Handles the creation of all database tables in the correct order to respect foreign key constraints.

**Tables Created (in order):**
1. `users` - User accounts and authentication
2. `categories` - Stock categories
3. `suppliers` - Supplier information
4. `stocks` - Inventory items
5. `supplyOrders` - Purchase orders
6. `supplyOrderItems` - Items within purchase orders
7. `transactions` - Sales transactions
8. `transactionItems` - Items within transactions
9. `activityLogs` - System activity logging

### Seed Manager (`src/main/lib/database/seedManager.ts`)

Populates the database with initial sample data for development and testing purposes.

## Service Architecture

The backend follows a **3-layer service architecture** for each entity (table):

```
┌─────────────────┐
│   Frontend      │ (React Components)
└─────────────────┘
         │
         │ IPC Communication
         ▼
┌─────────────────┐
│   IPC Layer     │ (auth-ipc.ts)
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ Service Layer   │ (auth-service.ts)
└─────────────────┘
         │
         ▼
┌─────────────────┐
│Repository Layer │ (auth-repo.ts)
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Database      │ (SQLite)
└─────────────────┘
```

### Why 3 Files Per Entity?

Each entity has three files that serve distinct purposes:

#### 1. **IPC Layer** (`*-ipc.ts`)
**Purpose**: Handles Inter-Process Communication between the main process and renderer process.

**Responsibilities:**
- Register IPC handlers using `ipcMain.handle()`
- Validate incoming data from the frontend
- Call appropriate service methods
- Format responses back to the frontend
- Handle errors and provide meaningful error messages
- Manage Electron-specific concerns (cookies, sessions)

**Example (`auth-ipc.ts`):**
```typescript
ipcMain.handle('auth:login', async (_, username, password) => {
  try {
    const user = await authService.validateUser(username, password)
    if (!user) {
      return { success: false, message: 'Invalid credentials' }
    }
    const token = authService.generateToken(user)
    // Store in Electron session
    await session.defaultSession.cookies.set({...})
    return { success: true, user }
  } catch (error) {
    return { success: false, message: 'Authentication failed' }
  }
})
```

#### 2. **Service Layer** (`*-service.ts`)
**Purpose**: Contains business logic and orchestrates repository operations.

**Responsibilities:**
- Implement business rules and validation
- Coordinate multiple repository calls if needed
- Handle complex operations (authentication, token generation)
- Transform data between layers
- Manage transactions that span multiple tables
- Implement domain-specific logic

**Example (`auth-service.ts`):**
```typescript
export class AuthService {
  async validateUser(username: string, password: string) {
    const user = authRepo.getUserByUsername(username)
    if (!user) return null
    
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) return null
    
    const { password: _, ...result } = user
    return result
  }
}
```

#### 3. **Repository Layer** (`*-repo.ts`)
**Purpose**: Direct database access and data persistence.

**Responsibilities:**
- Execute SQL queries
- Map database results to TypeScript interfaces
- Handle database-specific operations (CRUD)
- Manage prepared statements for performance
- Validate data constraints
- Handle database errors

**Example (`auth-repo.ts`):**
```typescript
export class AuthRepository {
  insertUser(user: User): number | null {
    const stmt = this.db.prepare(
      'INSERT INTO users (id, name, username, password, role, permissions) VALUES (?, ?, ?, ?, ?, ?)'
    )
    const info = stmt.run(user.id, user.name, user.username, user.password, user.role, user.permissions)
    return info.lastID
  }
}
```

## Benefits of This Architecture

### 1. **Separation of Concerns**
Each layer has a single responsibility:
- **IPC**: Communication protocol
- **Service**: Business logic
- **Repository**: Data access

### 2. **Testability**
- Services can be tested independently of IPC
- Repositories can be mocked for service testing
- Business logic is isolated from framework-specific code

### 3. **Maintainability**
- Changes to database schema only affect repository layer
- Business rule changes only affect service layer
- Communication protocol changes only affect IPC layer

### 4. **Reusability**
- Services can be used by multiple IPC handlers
- Repositories can be used by multiple services
- Business logic is not tied to communication protocol

### 5. **Security**
- Input validation occurs at multiple layers
- Database access is centralized and controlled
- Authentication logic is separated from data access

## Entity-Specific Services

### Authentication Service
- **Password Hashing**: Uses bcrypt for secure password storage
- **JWT Tokens**: Generates and validates JSON Web Tokens
- **Permission Management**: Handles role-based access control
- **Session Management**: Integrates with Electron's session system

### Stock Management Service
- **Inventory Tracking**: Manages stock quantities and locations
- **SKU Management**: Handles unique product identifiers
- **Reorder Point Monitoring**: Tracks when to reorder items
- **Price Management**: Manages both cost and selling prices

### Transaction Service
- **Sales Processing**: Handles complete sales transactions
- **Stock Updates**: Automatically adjusts inventory levels
- **Activity Logging**: Records all transaction activities
- **Multi-item Transactions**: Supports transactions with multiple items

### Supply Order Service
- **Purchase Order Management**: Creates and tracks purchase orders
- **Supplier Integration**: Links orders to specific suppliers
- **Order Item Tracking**: Manages individual items within orders
- **Status Management**: Tracks order fulfillment status

### Activity Logging Service
- **Audit Trail**: Maintains comprehensive activity logs
- **User Action Tracking**: Records who performed what actions
- **System Events**: Logs important system events
- **Compliance Support**: Supports regulatory compliance requirements

## Integration with Electron

### Main Process (`src/main/index.ts`)
The main process initializes:
1. **Database Manager**: Creates database connection
2. **IPC Handlers**: Registers all service IPC handlers
3. **Window Management**: Creates and manages application windows

### Preload Script (`src/preload/index.ts`)
Exposes secure APIs to the renderer process, creating a bridge between the frontend and backend services.

## Error Handling Strategy

### Database Level
- Transaction rollback on errors
- Constraint validation
- Foreign key integrity checks

### Service Level
- Business rule validation
- Data transformation errors
- External service integration errors

### IPC Level
- Input validation
- Response formatting
- Communication error handling

This architecture provides a robust, scalable foundation for the inventory management system while maintaining clear separation of concerns and enabling easy maintenance and testing.