import { assert } from 'console'
import DatabaseManager from '../../database/database'

export interface ActivityLog {
  id: string
  userId: string
  username: string
  action: string
  entityType: string
  entityId: string
  details?: string
  timestamp: string
  entityDetails?: any
}

interface RunResult {
  lastID: number
  changes: number
}

export class ActivityLogRepository {
  private db = DatabaseManager.getInstance().getDatabase()

  createActivityLog(log: ActivityLog): number | null {
    try {
      assert(log, 'Activity log is required')
      assert(log.userId, 'User ID is required')

      const stmt = this.db.prepare(
        'INSERT INTO activityLogs (id, userId, username, action, entityType, entityId, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )

      const info = stmt.run(
        log.id,
        log.userId,
        log.username,
        log.action,
        log.entityType,
        log.entityId,
        log.details,
        log.timestamp
      ) as unknown as RunResult

      return info.lastID
    } catch (error) {
      console.log('Error creating activity log: ', error)
      return null
    }
  }

  getAllActivityLogs(): ActivityLog[] | null {
    try {
      const stmt = this.db.prepare(`
        SELECT al.*, u.username 
        FROM activityLogs al
        LEFT JOIN users u ON al.userId = u.id
        ORDER BY al.timestamp DESC
      `)
      
      const activityLogs = stmt.all() as unknown as ActivityLog[]
      assert(Array.isArray(activityLogs), 'Expected activityLogs to be an array')
      
      // Enhance logs with entity details
      return activityLogs.map(log => {
        const entityDetails = this.getEntityDetails(log.entityType, log.entityId);
        return {
          ...log,
          entityDetails
        };
      });
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      return null;
    }
  }

  // Fetch entity details based on the entityType and entityId
  getEntityDetails(entityType: string, entityId: string): any {
    try {
      let query = '';
      
      switch (entityType) {
        case 'user':
          query = 'SELECT id, name, username, role FROM users WHERE id = ?';
          break;
        case 'stock':
          query = 'SELECT id, name, description, quantity, unit, status FROM stocks WHERE id = ?';
          break;
        case 'category':
          query = 'SELECT id, name, description FROM categories WHERE id = ?';
          break;
        case 'supplier':
          query = 'SELECT id, name, contactName, email FROM suppliers WHERE id = ?';
          break;
        case 'supplyOrder':
          query = `
            SELECT so.*, s.name as supplierName 
            FROM supplyOrders so 
            LEFT JOIN suppliers s ON so.supplierId = s.id
            WHERE so.id = ?
          `;
          break;
        case 'transaction':
          query = 'SELECT * FROM transactions WHERE id = ?';
          break;
        case 'orderItem':
          query = 'SELECT * FROM orderItems WHERE id = ?';
          break;
        default:
          return null;
      }
      
      // Only try to fetch if we have a valid query
      if (query) {
        const stmt = this.db.prepare(query);
        return stmt.get(entityId);
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching details for ${entityType} with ID ${entityId}:`, error);
      return null;
    }
  }
}

export const activityRepo = new ActivityLogRepository()