/**
 * Format a number as currency
 * @param amount - The number to format
 * @param currency - The currency code (default: PHP)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency = 'PHP'): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(amount)
}

/**
 * Format a date string to a human-readable format
 * @param dateString - ISO date string
 * @param includeTime - Whether to include the time
 * @returns Formatted date string
 */
export const formatDate = (dateString: string, includeTime = false): string => {
  if (!dateString) return ''

  const date = new Date(dateString)

  if (includeTime) {
    return date.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Check if a user has the required permission
 * @param userPermissions The user's permissions array
 * @param requiredPermission The permission to check for
 * @returns boolean indicating if the user has the permission
 */
export const hasPermission = (
  userPermissions: string[] | undefined,
  requiredPermission: string
): boolean => {
  if (!userPermissions) return false
  return userPermissions.includes('*') || userPermissions.includes(requiredPermission)
}
