import { ActivityLog, ActivityLogRepository, activityRepo } from './activity-repo'

export class ActivityLogService {
  constructor(private repo: ActivityLogRepository) {}

  async createLog(log: ActivityLog): Promise<boolean> {
    const result = this.repo.createActivityLog(log)
    return result !== null
  }

  async getAllLogs(): Promise<ActivityLog[]> {
    const logs = this.repo.getAllActivityLogs()
    return logs || []
  }
  
  getEntityDetails(entityType: string, entityId: string): any {
    return this.repo.getEntityDetails(entityType, entityId)
  }
}

export const activityLogService = new ActivityLogService(activityRepo)