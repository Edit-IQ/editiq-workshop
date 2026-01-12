import { Client, Transaction, Credential } from '../types'

// Simple localStorage-based database for demo mode
export const localDb = {
  // Clients
  getClients(userId: string): Client[] {
    const clients = JSON.parse(localStorage.getItem('clients') || '[]')
    return clients.filter((c: Client) => c.userId === userId)
  },

  addClient(userId: string, clientData: Omit<Client, 'id' | 'userId' | 'createdAt'>): string {
    const clients = JSON.parse(localStorage.getItem('clients') || '[]')
    const newClient: Client = {
      ...clientData,
      id: crypto.randomUUID(),
      userId,
      createdAt: Date.now()
    }
    clients.push(newClient)
    localStorage.setItem('clients', JSON.stringify(clients))
    console.log('Client saved to localStorage:', newClient)
    return newClient.id
  },

  deleteClient(userId: string, clientId: string): void {
    const clients = JSON.parse(localStorage.getItem('clients') || '[]')
    const filtered = clients.filter((c: Client) => c.id !== clientId || c.userId !== userId)
    localStorage.setItem('clients', JSON.stringify(filtered))
  },

  // Transactions
  getTransactions(userId: string): Transaction[] {
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]')
    return transactions.filter((t: Transaction) => t.userId === userId)
  },

  addTransaction(userId: string, txData: Omit<Transaction, 'id' | 'userId'>): string {
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]')
    const newTx: Transaction = {
      ...txData,
      id: crypto.randomUUID(),
      userId
    }
    transactions.push(newTx)
    localStorage.setItem('transactions', JSON.stringify(transactions))
    console.log('Transaction saved to localStorage:', newTx)
    return newTx.id
  },

  deleteTransaction(userId: string, txId: string): void {
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]')
    const filtered = transactions.filter((t: Transaction) => t.id !== txId || t.userId !== userId)
    localStorage.setItem('transactions', JSON.stringify(filtered))
  },

  // Credentials
  getCredentials(userId: string): Credential[] {
    const credentials = JSON.parse(localStorage.getItem('credentials') || '[]')
    return credentials.filter((c: Credential) => c.userId === userId)
  },

  addCredential(userId: string, credData: Omit<Credential, 'id' | 'userId' | 'createdAt'>): string {
    const credentials = JSON.parse(localStorage.getItem('credentials') || '[]')
    const newCred: Credential = {
      ...credData,
      id: crypto.randomUUID(),
      userId,
      createdAt: Date.now()
    }
    credentials.push(newCred)
    localStorage.setItem('credentials', JSON.stringify(credentials))
    console.log('Credential saved to localStorage:', newCred)
    return newCred.id
  },

  deleteCredential(userId: string, credId: string): void {
    const credentials = JSON.parse(localStorage.getItem('credentials') || '[]')
    const filtered = credentials.filter((c: Credential) => c.id !== credId || c.userId !== userId)
    localStorage.setItem('credentials', JSON.stringify(filtered))
  }
}