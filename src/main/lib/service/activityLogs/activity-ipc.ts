import { ipcMain } from 'electron'
import { activityLogService } from './activity-service'

export function setupActivityLogsIPC() {
  ipcMain.handle('log:create', async (_, log) => {
    try {
      const success = await activityLogService.createLog(log)
      return { success }
    } catch (error) {
      console.error('Error creating activity log:', error)
      return { success: false, message: 'Failed to create activity log' }
    }
  })

  ipcMain.handle('log:getAll', async () => {
    try {
      const logs = await activityLogService.getAllLogs()
      
      // Logs are already enhanced with entity details from the repository
      return { 
        success: true, 
        logs 
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error)
      return { success: false, message: 'Failed to fetch activity logs' }
    }
  })
}
