import { supabaseDb } from './supabaseDb'
import { localDb } from './localDb'

export const BackupService = {
  // Export all user data to JSON
  async exportAllData(userId: string) {
    try {
      console.log('Starting data export for user:', userId)
      
      // Get all data from appropriate source
      const [clients, transactions, credentials] = await Promise.all([
        userId === 'demo-user-123' ? localDb.getClients(userId) : supabaseDb.getClients(userId),
        userId === 'demo-user-123' ? localDb.getTransactions(userId) : supabaseDb.getTransactions(userId),
        userId === 'demo-user-123' ? localDb.getCredentials(userId) : supabaseDb.getCredentials(userId)
      ])

      // Create backup object
      const backup = {
        exportDate: new Date().toISOString(),
        userId: userId,
        data: {
          clients,
          transactions,
          credentials
        },
        summary: {
          totalClients: clients.length,
          totalTransactions: transactions.length,
          totalCredentials: credentials.length
        }
      }

      console.log('Data export completed:', backup.summary)
      return backup
    } catch (error) {
      console.error('Export failed:', error)
      throw error
    }
  },

  // Download backup as JSON file
  downloadBackup(backupData: any, filename?: string) {
    const fileName = filename || `editiq-backup-${new Date().toISOString().split('T')[0]}.json`
    const dataStr = JSON.stringify(backupData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    
    const link = document.createElement('a')
    link.href = URL.createObjectURL(dataBlob)
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    console.log('Backup downloaded:', fileName)
  },

  // Get data from localStorage (for demo users)
  getLocalStorageData() {
    const clients = JSON.parse(localStorage.getItem('clients') || '[]')
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]')
    const credentials = JSON.parse(localStorage.getItem('credentials') || '[]')
    
    return {
      clients,
      transactions,
      credentials,
      summary: {
        totalClients: clients.length,
        totalTransactions: transactions.length,
        totalCredentials: credentials.length
      }
    }
  },

  // Manual backup from Supabase (bypass RLS temporarily)
  async manualSupabaseBackup() {
    try {
      // This will get all data regardless of RLS
      const { supabase } = await import('./supabase')
      
      const [clientsResult, transactionsResult, credentialsResult] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('credentials').select('*')
      ])

      return {
        clients: clientsResult.data || [],
        transactions: transactionsResult.data || [],
        credentials: credentialsResult.data || [],
        errors: {
          clients: clientsResult.error,
          transactions: transactionsResult.error,
          credentials: credentialsResult.error
        }
      }
    } catch (error) {
      console.error('Manual backup failed:', error)
      throw error
    }
  }
}