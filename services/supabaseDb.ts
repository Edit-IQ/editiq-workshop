import { supabase } from './supabase'
import { Client, Transaction, Credential, TransactionType } from '../types'

export const supabaseDb = {
  // Check if we should use localStorage (for demo users only)
  shouldUseLocalStorage(userId: string): boolean {
    return userId === 'demo-user-123';
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
    if (this.shouldUseLocalStorage(userId)) {
      const clients = JSON.parse(localStorage.getItem('clients') || '[]');
      const filtered = clients.filter((c: Client) => c.id !== clientId || c.userId !== userId);
      localStorage.setItem('clients', JSON.stringify(filtered));
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('userId', userId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Delete client failed:', error);
      // Fallback to localStorage
      const clients = JSON.parse(localStorage.getItem('clients') || '[]');
      const filtered = clients.filter((c: Client) => c.id !== clientId || c.userId !== userId);
      localStorage.setItem('clients', JSON.stringify(filtered));
    }
  },

  // Transactions
  async getTransactions(userId: string): Promise<Transaction[]> {
    if (this.shouldUseLocalStorage(userId)) {
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      return transactions.filter((t: Transaction) => t.userId === userId);
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('userId', userId)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Supabase error, falling back to localStorage:', error);
        const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        return transactions.filter((t: Transaction) => t.userId === userId);
      }
      
      return data || [];
    } catch (error) {
      console.error('Get transactions failed, using localStorage:', error);
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      return transactions.filter((t: Transaction) => t.userId === userId);
    }
  },

  subscribeToTransactions(userId: string, callback: (transactions: Transaction[]) => void) {
    // Initial fetch
    this.getTransactions(userId).then(callback).catch(console.error);
    
    if (this.shouldUseLocalStorage(userId)) {
      // For demo users, just poll localStorage
      const interval = setInterval(() => {
        this.getTransactions(userId).then(callback).catch(console.error);
      }, 1000);
      
      return () => clearInterval(interval);
    }
    
    // For real users, use Supabase real-time
    const subscription = supabase
      .channel('transactions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions', filter: `userId=eq.${userId}` },
        () => {
          this.getTransactions(userId).then(callback).catch(console.error);
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  },

  async addTransaction(userId: string, txData: Omit<Transaction, 'id' | 'userId'>): Promise<string> {
    const newTx: Transaction = {
      ...txData,
      id: crypto.randomUUID(),
      userId
    };

    if (this.shouldUseLocalStorage(userId)) {
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      transactions.push(newTx);
      localStorage.setItem('transactions', JSON.stringify(transactions));
      console.log('Transaction saved to localStorage:', newTx);
      return newTx.id;
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{ ...newTx, id: undefined }]) // Let Supabase generate ID
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error, saving to localStorage:', error);
        const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        transactions.push(newTx);
        localStorage.setItem('transactions', JSON.stringify(transactions));
        return newTx.id;
      }
      
      return data.id;
    } catch (error) {
      console.error('Add transaction failed, using localStorage:', error);
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      transactions.push(newTx);
      localStorage.setItem('transactions', JSON.stringify(transactions));
      return newTx.id;
    }
  },

  async deleteTransaction(userId: string, txId: string): Promise<void> {
    if (this.shouldUseLocalStorage(userId)) {
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      const filtered = transactions.filter((t: Transaction) => t.id !== txId || t.userId !== userId);
      localStorage.setItem('transactions', JSON.stringify(filtered));
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', txId)
        .eq('userId', userId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Delete transaction failed:', error);
      // Fallback to localStorage
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      const filtered = transactions.filter((t: Transaction) => t.id !== txId || t.userId !== userId);
      localStorage.setItem('transactions', JSON.stringify(filtered));
    }
  },

  // Credentials
  async getCredentials(userId: string): Promise<Credential[]> {
    if (this.shouldUseLocalStorage(userId)) {
      const credentials = JSON.parse(localStorage.getItem('credentials') || '[]');
      return credentials.filter((c: Credential) => c.userId === userId);
    }

    try {
      const { data, error } = await supabase
        .from('credentials')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.error('Supabase error, falling back to localStorage:', error);
        const credentials = JSON.parse(localStorage.getItem('credentials') || '[]');
        return credentials.filter((c: Credential) => c.userId === userId);
      }
      
      return data || [];
    } catch (error) {
      console.error('Get credentials failed, using localStorage:', error);
      const credentials = JSON.parse(localStorage.getItem('credentials') || '[]');
      return credentials.filter((c: Credential) => c.userId === userId);
    }
  },

  subscribeToCredentials(userId: string, callback: (credentials: Credential[]) => void) {
    // Initial fetch
    this.getCredentials(userId).then(callback).catch(console.error);
    
    if (this.shouldUseLocalStorage(userId)) {
      // For demo users, just poll localStorage
      const interval = setInterval(() => {
        this.getCredentials(userId).then(callback).catch(console.error);
      }, 1000);
      
      return () => clearInterval(interval);
    }
    
    // For real users, use Supabase real-time
    const subscription = supabase
      .channel('credentials')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'credentials', filter: `userId=eq.${userId}` },
        () => {
          this.getCredentials(userId).then(callback).catch(console.error);
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  },

  async addCredential(userId: string, credData: Omit<Credential, 'id' | 'userId' | 'createdAt'>): Promise<string> {
    const newCred: Credential = {
      ...credData,
      id: crypto.randomUUID(),
      userId,
      createdAt: Date.now()
    };

    if (this.shouldUseLocalStorage(userId)) {
      const credentials = JSON.parse(localStorage.getItem('credentials') || '[]');
      credentials.push(newCred);
      localStorage.setItem('credentials', JSON.stringify(credentials));
      console.log('Credential saved to localStorage:', newCred);
      return newCred.id;
    }

    try {
      const { data, error } = await supabase
        .from('credentials')
        .insert([{ ...newCred, id: undefined }]) // Let Supabase generate ID
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error, saving to localStorage:', error);
        const credentials = JSON.parse(localStorage.getItem('credentials') || '[]');
        credentials.push(newCred);
        localStorage.setItem('credentials', JSON.stringify(credentials));
        return newCred.id;
      }
      
      return data.id;
    } catch (error) {
      console.error('Add credential failed, using localStorage:', error);
      const credentials = JSON.parse(localStorage.getItem('credentials') || '[]');
      credentials.push(newCred);
      localStorage.setItem('credentials', JSON.stringify(credentials));
      return newCred.id;
    }
  },

  async deleteCredential(userId: string, credId: string): Promise<void> {
    if (this.shouldUseLocalStorage(userId)) {
      const credentials = JSON.parse(localStorage.getItem('credentials') || '[]');
      const filtered = credentials.filter((c: Credential) => c.id !== credId || c.userId !== userId);
      localStorage.setItem('credentials', JSON.stringify(filtered));
      return;
    }

    try {
      const { error } = await supabase
        .from('credentials')
        .delete()
        .eq('id', credId)
        .eq('userId', userId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Delete credential failed:', error);
      // Fallback to localStorage
      const credentials = JSON.parse(localStorage.getItem('credentials') || '[]');
      const filtered = credentials.filter((c: Credential) => c.id !== credId || c.userId !== userId);
      localStorage.setItem('credentials', JSON.stringify(filtered));
    }
  }
}