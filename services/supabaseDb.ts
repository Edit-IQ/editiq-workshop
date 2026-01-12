import { supabase } from './supabase'
import { Client, Transaction, Credential, TransactionType } from '../types'

export const supabaseDb = {
  // Check if we should use localStorage (for demo users)
  shouldUseLocalStorage(userId: string): boolean {
    return userId === 'demo-user-123' || !userId.includes('@');
  },

  // Clients
  async getClients(userId: string): Promise<Client[]> {
    if (this.shouldUseLocalStorage(userId)) {
      console.log('Using localStorage for demo user');
      const clients = JSON.parse(localStorage.getItem('clients') || '[]');
      return clients.filter((c: Client) => c.userId === userId);
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.error('Supabase error, falling back to localStorage:', error);
        const clients = JSON.parse(localStorage.getItem('clients') || '[]');
        return clients.filter((c: Client) => c.userId === userId);
      }
      
      return data || [];
    } catch (error) {
      console.error('Get clients failed, using localStorage:', error);
      const clients = JSON.parse(localStorage.getItem('clients') || '[]');
      return clients.filter((c: Client) => c.userId === userId);
    }
  },

  subscribeToClients(userId: string, callback: (clients: Client[]) => void) {
    // Initial fetch
    this.getClients(userId).then(callback).catch(console.error);
    
    if (this.shouldUseLocalStorage(userId)) {
      // For demo users, just poll localStorage
      const interval = setInterval(() => {
        this.getClients(userId).then(callback).catch(console.error);
      }, 1000);
      
      return () => clearInterval(interval);
    }
    
    // For real users, use Supabase real-time
    const subscription = supabase
      .channel('clients')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'clients', filter: `userId=eq.${userId}` },
        () => {
          this.getClients(userId).then(callback).catch(console.error);
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  },

  async addClient(userId: string, clientData: Omit<Client, 'id' | 'userId' | 'createdAt'>): Promise<string> {
    const newClient = {
      ...clientData,
      userId,
      createdAt: Date.now(),
      id: crypto.randomUUID()
    };

    if (this.shouldUseLocalStorage(userId)) {
      console.log('Saving client to localStorage:', newClient);
      const clients = JSON.parse(localStorage.getItem('clients') || '[]');
      clients.push(newClient);
      localStorage.setItem('clients', JSON.stringify(clients));
      return newClient.id;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...newClient, id: undefined }]) // Let Supabase generate ID
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error, saving to localStorage:', error);
        const clients = JSON.parse(localStorage.getItem('clients') || '[]');
        clients.push(newClient);
        localStorage.setItem('clients', JSON.stringify(clients));
        return newClient.id;
      }
      
      return data.id;
    } catch (error) {
      console.error('Add client failed, using localStorage:', error);
      const clients = JSON.parse(localStorage.getItem('clients') || '[]');
      clients.push(newClient);
      localStorage.setItem('clients', JSON.stringify(clients));
      return newClient.id;
    }
  },

  async deleteClient(userId: string, clientId: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('userId', userId)
    
    if (error) throw error
  },

  // Transactions
  async getTransactions(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('userId', userId)
      .order('date', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  subscribeToTransactions(userId: string, callback: (transactions: Transaction[]) => void) {
    // Initial fetch
    this.getTransactions(userId).then(callback).catch(console.error)
    
    // Real-time subscription
    const subscription = supabase
      .channel('transactions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions', filter: `userId=eq.${userId}` },
        () => {
          this.getTransactions(userId).then(callback).catch(console.error)
        }
      )
      .subscribe()

    return () => subscription.unsubscribe()
  },

  async addTransaction(userId: string, txData: Omit<Transaction, 'id' | 'userId'>): Promise<string> {
    const { data, error } = await supabase
      .from('transactions')
      .insert([{ ...txData, userId }])
      .select()
      .single()
    
    if (error) throw error
    return data.id
  },

  async deleteTransaction(userId: string, txId: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', txId)
      .eq('userId', userId)
    
    if (error) throw error
  },

  // Credentials
  async getCredentials(userId: string): Promise<Credential[]> {
    const { data, error } = await supabase
      .from('credentials')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  subscribeToCredentials(userId: string, callback: (credentials: Credential[]) => void) {
    // Initial fetch
    this.getCredentials(userId).then(callback).catch(console.error)
    
    // Real-time subscription
    const subscription = supabase
      .channel('credentials')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'credentials', filter: `userId=eq.${userId}` },
        () => {
          this.getCredentials(userId).then(callback).catch(console.error)
        }
      )
      .subscribe()

    return () => subscription.unsubscribe()
  },

  async addCredential(userId: string, credData: Omit<Credential, 'id' | 'userId' | 'createdAt'>): Promise<string> {
    const { data, error } = await supabase
      .from('credentials')
      .insert([{ ...credData, userId, createdAt: Date.now() }])
      .select()
      .single()
    
    if (error) throw error
    return data.id
  },

  async deleteCredential(userId: string, credId: string): Promise<void> {
    const { error } = await supabase
      .from('credentials')
      .delete()
      .eq('id', credId)
      .eq('userId', userId)
    
    if (error) throw error
  }
}