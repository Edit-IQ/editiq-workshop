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
    
    // Try to read your specific user data directly
    const specificUserId = 'WpskF7imp5SEp28t0t22v5wA'; // Updated to match your exact Firebase Auth UID
    console.log('🎯 Looking for data with userId:', specificUserId);
    
    // Try to read clients for your specific user ID
    const clientsQuery = query(
      collection(db, 'clients'),
      where('userId', '==', specificUserId)
    );
    const clientsSnapshot = await getDocs(clientsQuery);
    console.log('✅ Your clients found:', clientsSnapshot.size);
    
    clientsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('📄 Client:', data.name, 'Platform:', data.platform);
    });
    
    // Try to read transactions for your specific user ID
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', specificUserId)
    );
    const transactionsSnapshot = await getDocs(transactionsQuery);
    console.log('✅ Your transactions found:', transactionsSnapshot.size);
    
    transactionsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('💰 Transaction:', data.amount, data.type, data.category);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Firestore connection test failed:', error);
    return false;
  }
};

// Direct data access function (bypasses authentication)
export const getDirectFirebaseData = async () => {
  try {
    const specificUserId = 'WpskF7imp5SEp28t0t22v5wA'; // Updated to match your exact Firebase Auth UID
    console.log('🔍 Direct Firebase data access for:', specificUserId);
    
    // Get clients
    const clientsQuery = query(
      collection(db, 'clients'),
      where('userId', '==', specificUserId),
      orderBy('createdAt', 'desc')
    );
    const clientsSnapshot = await getDocs(clientsQuery);
    const clients: any[] = [];
    
    clientsSnapshot.forEach((doc) => {
      const data = doc.data();
      clients.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toMillis() || Date.now()
      });
    });
    
    // Get transactions
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', specificUserId),
      orderBy('date', 'desc')
    );
    const transactionsSnapshot = await getDocs(transactionsQuery);
    const transactions: any[] = [];
    
    transactionsSnapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        ...data
      });
    });
    
    console.log('📊 Direct access results:', {
      clients: clients.length,
      transactions: transactions.length
    });
    
    return { clients, transactions };
  } catch (error) {
    console.error('❌ Direct Firebase access failed:', error);
    return { clients: [], transactions: [] };
  }
};

export const firebaseDb = {
  // Check if we should use localStorage (for demo users only)
  shouldUseLocalStorage(userId: string): boolean {
    return userId === 'demo-user-123';
  },

  // Map current user ID to old Firebase user ID for data access
  getFirebaseUserId(currentUserId: string): string {
    console.log('🔍 Mapping user ID:', currentUserId);
    
    // Only map to your specific old data if it's your exact account
    if (currentUserId === 'test-firebase-user-456' || 
        currentUserId.includes('deyankur.391@gmail.com')) {
      console.log('✅ Using your old Firebase user ID: WpskF7imp5SEp28t0t22v5wA');
      return 'WpskF7imp5SEp28t0t22v5wA'; // Your specific Firebase user ID for deyankur.391@gmail.com
    }
    
    // For all other users, use their actual user ID (separate data)
    console.log('✅ Using actual user ID for separate data:', currentUserId);
    return currentUserId;
  },

  // Clients
  async getClients(userId: string): Promise<Client[]> {
    if (this.shouldUseLocalStorage(userId)) {
      console.log('Using localStorage for demo user');
      const clients = JSON.parse(localStorage.getItem('clients') || '[]');
      return clients.filter((c: Client) => c.userId === userId);
    }

    try {
      const firebaseUserId = this.getFirebaseUserId(userId);
      console.log('🔍 Firebase: Fetching clients for userId:', userId, '-> Firebase userId:', firebaseUserId);
      
      // Simplified query without orderBy to avoid index issues
      const q = query(
        collection(db, 'clients'),
        where('userId', '==', firebaseUserId)
      );
      
      const querySnapshot = await getDocs(q);
      const clients: Client[] = [];
      
      console.log('🎯 Firebase: Clients found:', querySnapshot.size);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('✅ Client:', doc.id, data.name);
        clients.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis() || Date.now()
        } as Client);
      });
      
      // Sort in memory instead of using orderBy
      clients.sort((a, b) => b.createdAt - a.createdAt);
      
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
    
    // For real users, use Firestore real-time with mapped user ID (simplified query)
    const firebaseUserId = this.getFirebaseUserId(userId);
    const q = query(
      collection(db, 'clients'),
      where('userId', '==', firebaseUserId)
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
      // Sort in memory
      clients.sort((a, b) => b.createdAt - a.createdAt);
      callback(clients);
    });
  },

  async addClient(userId: string, clientData: Omit<Client, 'id' | 'userId' | 'createdAt'>): Promise<string> {
    const firebaseUserId = this.getFirebaseUserId(userId);
    console.log('🔍 Adding client - Original userId:', userId, '-> Firebase userId:', firebaseUserId);
    
    const newClient = {
      ...clientData,
      userId: firebaseUserId, // Use mapped user ID for new data
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
      console.log('✅ Client added to localStorage:', localClient.id);
      return localClient.id;
    }

    try {
      console.log('💾 Adding client to Firebase:', newClient);
      const docRef = await addDoc(collection(db, 'clients'), newClient);
      console.log('✅ Client added to Firebase:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Add client failed, using localStorage:', error);
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
      const firebaseUserId = this.getFirebaseUserId(userId);
      console.log('🔍 Firebase: Fetching transactions for userId:', userId, '-> Firebase userId:', firebaseUserId);
      
      // Simplified query without orderBy to avoid index issues
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', firebaseUserId)
      );
      
      const querySnapshot = await getDocs(q);
      const transactions: Transaction[] = [];
      
      console.log('🎯 Firebase: Transactions found:', querySnapshot.size);
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('✅ Transaction:', doc.id, data.amount, data.type);
        // Normalize transaction type to uppercase to match enum
        const normalizedType = typeof data.type === 'string' ? data.type.toUpperCase() : data.type;
        transactions.push({
          id: doc.id,
          ...data,
          type: normalizedType // Ensure type matches TransactionType enum
        } as Transaction);
      });
      
      // Sort in memory by date
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
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
    
    const firebaseUserId = this.getFirebaseUserId(userId);
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', firebaseUserId)
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const transactions: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Normalize transaction type to uppercase to match enum
        const normalizedType = typeof data.type === 'string' ? data.type.toUpperCase() : data.type;
        transactions.push({
          id: doc.id,
          ...data,
          type: normalizedType // Ensure type matches TransactionType enum
        } as Transaction);
      });
      // Sort in memory by date
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(transactions);
    });
  },

  async addTransaction(userId: string, txData: Omit<Transaction, 'id' | 'userId'>): Promise<string> {
    const firebaseUserId = this.getFirebaseUserId(userId);
    console.log('🔍 Adding transaction - Original userId:', userId, '-> Firebase userId:', firebaseUserId);
    
    const newTx = {
      ...txData,
      userId: firebaseUserId // Use mapped user ID for new data
    };

    if (this.shouldUseLocalStorage(userId)) {
      const localTx = {
        ...newTx,
        userId, // Keep original for localStorage
        id: crypto.randomUUID()
      };
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      transactions.push(localTx);
      localStorage.setItem('transactions', JSON.stringify(transactions));
      console.log('✅ Transaction added to localStorage:', localTx.id);
      return localTx.id;
    }

    try {
      console.log('💾 Adding transaction to Firebase:', newTx);
      const docRef = await addDoc(collection(db, 'transactions'), newTx);
      console.log('✅ Transaction added to Firebase:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Add transaction failed, using localStorage:', error);
      const localTx = {
        ...newTx,
        userId,
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
      const firebaseUserId = this.getFirebaseUserId(userId);
      console.log('🔍 Firebase: Fetching credentials for userId:', userId, '-> Firebase userId:', firebaseUserId);
      
      const q = query(
        collection(db, 'credentials'),
        where('userId', '==', firebaseUserId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const credentials: Credential[] = [];
      
      console.log('🎯 Firebase: Filtered credentials found:', querySnapshot.size);
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
    
    const firebaseUserId = this.getFirebaseUserId(userId);
    const q = query(
      collection(db, 'credentials'),
      where('userId', '==', firebaseUserId),
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
    const firebaseUserId = this.getFirebaseUserId(userId);
    const newCred = {
      ...credData,
      userId: firebaseUserId, // Use mapped user ID for new data
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