export type FormMode = 'view' | 'add' | 'edit' | 'delete'

export interface ActivityLog {
  id: string
  userId: string
  username: string
  action: string
  entityType: string
  entityId: string
  details?: string
  timestamp: string
}