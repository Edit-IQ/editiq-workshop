import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Client, Transaction, Credential } from '../types';

// Test function to check Firestore connectivity
export const testFirestoreConnection = async () => {
  try {
    console.log('🧪 Testing Firestore connection...');
    
    // Try to read from a simple collection
    const testCollection = collection(db, 'test');
    const snapshot = await getDocs(testCollection);
    console.log('✅ Firestore connection successful, test collection size:', snapshot.size);
    
    // Try to read all clients without filters
    const clientsCollection = collection(db, 'clients');
    const clientsSnapshot = await getDocs(clientsCollection);
    console.log('✅ Clients collection accessible, total docs:', clientsSnapshot.size);
    
    // Try to read all transactions without filters
    const transactionsCollection = collection(db, 'transactions');
    const transactionsSnapshot = await getDocs(transactionsCollection);
    console.log('✅ Transactions collection accessible, total docs:', transactionsSnapshot.size);
    
    return true;
  } catch (error) {
    console.error('❌ Firestore connection test failed:', error);
    return false;
  }
};

export const firebaseDb = {
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
      console.log('🔍 Firebase: Fetching clients for userId:', userId);
      
      // First, try to get all clients to see what's in the database
      const allClientsQuery = query(collection(db, 'clients'));
      const allSnapshot = await getDocs(allClientsQuery);
      
      console.log('📊 Firebase: Total clients in database:', allSnapshot.size);
      allSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📄 Client doc:', doc.id, 'userId:', data.userId, 'name:', data.name);
      });
      
      // Now try the filtered query
      const q = query(
        collection(db, 'clients'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const clients: Client[] = [];
      
      console.log('🎯 Firebase: Filtered clients found:', querySnapshot.size);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('✅ Matched client:', doc.id, data.name);
        clients.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis() || Date.now()
        } as Client);
      });
      
      return clients;
    } catch (error) {
      console.error('Get clients failed, using localStorage:', error);
      const clients = JSON.parse(localStorage.getItem('clients') || '[]');
      return clients.filter((c: Client) => c.userId === userId);
    }
  },

  subscribeToClients(userId: string, callback: (clients: Client[]) => void) {
    if (this.shouldUseLocalStorage(userId)) {
      // For demo users, just poll localStorage
      this.getClients(userId).then(callback).catch(console.error);
      const interval = setInterval(() => {
        this.getClients(userId).then(callback).catch(console.error);
      }, 1000);
      return () => clearInterval(interval);
    }
    
    // For real users, use Firestore real-time
    const q = query(
      collection(db, 'clients'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const clients: Client[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        clients.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis() || Date.now()
        } as Client);
      });
      callback(clients);
    });
  },

  async addClient(userId: string, clientData: Omit<Client, 'id' | 'userId' | 'createdAt'>): Promise<string> {
    const newClient = {
      ...clientData,
      userId,
      createdAt: Timestamp.now()
    };

    if (this.shouldUseLocalStorage(userId)) {
      const localClient = {
        ...clientData,
        userId,
        createdAt: Date.now(),
        id: crypto.randomUUID()
      };
      const clients = JSON.parse(localStorage.getItem('clients') || '[]');
      clients.push(localClient);
      localStorage.setItem('clients', JSON.stringify(clients));
      return localClient.id;
    }

    try {
      const docRef = await addDoc(collection(db, 'clients'), newClient);
      return docRef.id;
    } catch (error) {
      console.error('Add client failed, using localStorage:', error);
      const localClient = {
        ...clientData,
        userId,
        createdAt: Date.now(),
        id: crypto.randomUUID()
      };
      const clients = JSON.parse(localStorage.getItem('clients') || '[]');
      clients.push(localClient);
      localStorage.setItem('clients', JSON.stringify(clients));
      return localClient.id;
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
      await deleteDoc(doc(db, 'clients', clientId));
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
      console.log('🔍 Firebase: Fetching transactions for userId:', userId);
      
      // First, try to get all transactions to see what's in the database
      const allTransactionsQuery = query(collection(db, 'transactions'));
      const allSnapshot = await getDocs(allTransactionsQuery);
      
      console.log('📊 Firebase: Total transactions in database:', allSnapshot.size);
      allSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📄 Transaction doc:', doc.id, 'userId:', data.userId, 'amount:', data.amount, 'type:', data.type);
      });
      
      // Now try the filtered query
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const transactions: Transaction[] = [];
      
      console.log('🎯 Firebase: Filtered transactions found:', querySnapshot.size);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('✅ Matched transaction:', doc.id, data.amount, data.type);
        transactions.push({
          id: doc.id,
          ...data
        } as Transaction);
      });
      
      return transactions;
    } catch (error) {
      console.error('Get transactions failed, using localStorage:', error);
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      return transactions.filter((t: Transaction) => t.userId === userId);
    }
  },

  subscribeToTransactions(userId: string, callback: (transactions: Transaction[]) => void) {
    if (this.shouldUseLocalStorage(userId)) {
      this.getTransactions(userId).then(callback).catch(console.error);
      const interval = setInterval(() => {
        this.getTransactions(userId).then(callback).catch(console.error);
      }, 1000);
      return () => clearInterval(interval);
    }
    
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const transactions: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          ...data
        } as Transaction);
      });
      callback(transactions);
    });
  },

  async addTransaction(userId: string, txData: Omit<Transaction, 'id' | 'userId'>): Promise<string> {
    const newTx = {
      ...txData,
      userId
    };

    if (this.shouldUseLocalStorage(userId)) {
      const localTx = {
        ...newTx,
        id: crypto.randomUUID()
      };
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      transactions.push(localTx);
      localStorage.setItem('transactions', JSON.stringify(transactions));
      return localTx.id;
    }

    try {
      const docRef = await addDoc(collection(db, 'transactions'), newTx);
      return docRef.id;
    } catch (error) {
      console.error('Add transaction failed, using localStorage:', error);
      const localTx = {
        ...newTx,
        id: crypto.randomUUID()
      };
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      transactions.push(localTx);
      localStorage.setItem('transactions', JSON.stringify(transactions));
      return localTx.id;
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
      await deleteDoc(doc(db, 'transactions', txId));
    } catch (error) {
      console.error('Delete transaction failed:', error);
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
      const q = query(
        collection(db, 'credentials'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const credentials: Credential[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        credentials.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis() || Date.now()
        } as Credential);
      });
      
      return credentials;
    } catch (error) {
      console.error('Get credentials failed, using localStorage:', error);
      const credentials = JSON.parse(localStorage.getItem('credentials') || '[]');
      return credentials.filter((c: Credential) => c.userId === userId);
    }
  },

  subscribeToCredentials(userId: string, callback: (credentials: Credential[]) => void) {
    if (this.shouldUseLocalStorage(userId)) {
      this.getCredentials(userId).then(callback).catch(console.error);
      const interval = setInterval(() => {
        this.getCredentials(userId).then(callback).catch(console.error);
      }, 1000);
      return () => clearInterval(interval);
    }
    
    const q = query(
      collection(db, 'credentials'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const credentials: Credential[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        credentials.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis() || Date.now()
        } as Credential);
      });
      callback(credentials);
    });
  },

  async addCredential(userId: string, credData: Omit<Credential, 'id' | 'userId' | 'createdAt'>): Promise<string> {
    const newCred = {
      ...credData,
      userId,
      createdAt: Timestamp.now()
    };

    if (this.shouldUseLocalStorage(userId)) {
      const localCred = {
        ...credData,
        userId,
        createdAt: Date.now(),
        id: crypto.randomUUID()
      };
      const credentials = JSON.parse(localStorage.getItem('credentials') || '[]');
      credentials.push(localCred);
      localStorage.setItem('credentials', JSON.stringify(credentials));
      return localCred.id;
    }

    try {
      const docRef = await addDoc(collection(db, 'credentials'), newCred);
      return docRef.id;
    } catch (error) {
      console.error('Add credential failed, using localStorage:', error);
      const localCred = {
        ...credData,
        userId,
        createdAt: Date.now(),
        id: crypto.randomUUID()
      };
      const credentials = JSON.parse(localStorage.getItem('credentials') || '[]');
      credentials.push(localCred);
      localStorage.setItem('credentials', JSON.stringify(credentials));
      return localCred.id;
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
      await deleteDoc(doc(db, 'credentials', credId));
    } catch (error) {
      console.error('Delete credential failed:', error);
      const credentials = JSON.parse(localStorage.getItem('credentials') || '[]');
      const filtered = credentials.filter((c: Credential) => c.id !== credId || c.userId !== userId);
      localStorage.setItem('credentials', JSON.stringify(credentials));
    }
  }
};