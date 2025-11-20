import { Wallet, Transaction, TransactionStatus, TransactionPacket } from '../types';

const STORAGE_KEY_WALLETS = 'offline_upi_wallets';
const STORAGE_KEY_TRANSACTIONS = 'offline_upi_transactions';

// SHA-256 hash for "1234"
const DEFAULT_PIN_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';

// Helper for Unique IDs
const generateId = (prefix: string = 'tx'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const hashPin = async (pin: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Initial Demo Data
const DEMO_WALLETS: Wallet[] = [
  {
    id: 'wallet_a',
    name: 'Demo User A',
    phoneNumber: '9023456766',
    address: '56766@chain',
    balance: 50,
    pinHash: DEFAULT_PIN_HASH
  },
  {
    id: 'wallet_b',
    name: 'Demo User B',
    phoneNumber: '9098765432',
    address: '65432@chain',
    balance: 50,
    pinHash: DEFAULT_PIN_HASH
  }
];

export const initializeStorage = () => {
  const storedWallets = localStorage.getItem(STORAGE_KEY_WALLETS);
  if (!storedWallets) {
    localStorage.setItem(STORAGE_KEY_WALLETS, JSON.stringify(DEMO_WALLETS));
  } else {
    // Migration: If wallets are using the old plain text '1234', overwrite with hashed version
    try {
        const parsed = JSON.parse(storedWallets);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].pinHash === '1234') {
            console.log("Migrating legacy wallets to hashed PINs...");
            localStorage.setItem(STORAGE_KEY_WALLETS, JSON.stringify(DEMO_WALLETS));
        }
    } catch (e) {
        console.error("Error parsing wallets for migration check", e);
    }
  }

  if (!localStorage.getItem(STORAGE_KEY_TRANSACTIONS)) {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify([]));
  }
};

export const getWallets = (): Wallet[] => {
  initializeStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEY_WALLETS) || '[]');
};

export const getTransactions = (): Transaction[] => {
  initializeStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || '[]');
};

export const saveWallets = (wallets: Wallet[]) => {
  localStorage.setItem(STORAGE_KEY_WALLETS, JSON.stringify(wallets));
};

export const saveTransactions = (txs: Transaction[]) => {
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(txs));
};

export const getAllData = () => {
  return {
    wallets: getWallets(),
    transactions: getTransactions()
  };
};

export const restoreData = (data: { wallets: Wallet[], transactions: Transaction[] }) => {
  if (data.wallets) saveWallets(data.wallets);
  if (data.transactions) saveTransactions(data.transactions);
};

export const generateHash = (): string => {
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
};

export const topUpWallet = (phoneNumber: string, amount: number, source: string = 'Cash') => {
  const wallets = getWallets();
  const transactions = getTransactions();
  const wallet = wallets.find(w => w.phoneNumber === phoneNumber);
  
  if (wallet) {
    wallet.balance += amount;
    const tx: Transaction = {
      id: generateId('tx_topup'),
      senderPhone: 'TOPUP',
      senderAddress: source, // Use source (e.g., Google Pay) here
      receiverPhone: phoneNumber,
      receiverAddress: wallet.address,
      amount: amount,
      timestamp: Date.now(),
      status: TransactionStatus.CONFIRMED,
      type: 'TOPUP'
    };
    
    saveWallets(wallets);
    saveTransactions([...transactions, tx]);
  }
};

export const processOfflineTransaction = (packet: TransactionPacket) => {
  const wallets = getWallets();
  const transactions = getTransactions();

  const sender = wallets.find(w => w.phoneNumber === packet.senderPhone);
  // const receiver = wallets.find(w => w.phoneNumber === packet.receiverPhone);

  // Generate unique IDs
  const senderTxId = generateId('tx_send');
  const receiverTxId = generateId('tx_recv');

  // Create Transaction Records
  // 1. Sender's Record (Pending, Deducted locally)
  const senderTx: Transaction = {
    id: senderTxId,
    senderPhone: packet.senderPhone,
    senderAddress: packet.senderAddress,
    receiverPhone: packet.receiverPhone,
    receiverAddress: packet.receiverAddress,
    amount: packet.amount,
    timestamp: packet.timestamp,
    status: TransactionStatus.PENDING,
    type: 'SEND'
  };

  // 2. Receiver's Record (Pending, Not added to balance yet until sync or "received" packet processing)
  // In this offline demo, we simulate the receiver getting the packet immediately if "Bluetooth" is used.
  const receiverTx: Transaction = {
    id: receiverTxId,
    senderPhone: packet.senderPhone,
    senderAddress: packet.senderAddress,
    receiverPhone: packet.receiverPhone,
    receiverAddress: packet.receiverAddress,
    amount: packet.amount,
    timestamp: packet.timestamp,
    status: TransactionStatus.PENDING,
    type: 'RECEIVE'
  };

  // Update Sender Balance Immediately (Optimistic UI)
  if (sender) {
    sender.balance -= packet.amount;
  }

  // Receiver Balance is NOT updated yet. It waits for Sync.
  
  saveWallets(wallets);
  saveTransactions([...transactions, senderTx, receiverTx]);
};

export const syncBlockchain = (): Promise<number> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const wallets = getWallets();
      const transactions = getTransactions();
      let syncCount = 0;

      const updatedTransactions = transactions.map(tx => {
        // Ensure every transaction has an ID (fallback for legacy data)
        const txId = tx.id || generateId('tx_restored');

        if (tx.status === TransactionStatus.PENDING) {
          syncCount++;
          
          // If it's a RECEIVE transaction that was pending, apply balance now
          if (tx.type === 'RECEIVE') {
            const receiver = wallets.find(w => w.phoneNumber === tx.receiverPhone);
            if (receiver) {
              receiver.balance += tx.amount;
            }
          }
          
          return {
            ...tx,
            id: txId,
            status: TransactionStatus.CONFIRMED,
            hash: generateHash()
          };
        }
        // Return transaction with ensured ID
        return { ...tx, id: txId };
      });

      saveWallets(wallets);
      saveTransactions(updatedTransactions);
      resolve(syncCount);
    }, 2000);
  });
};