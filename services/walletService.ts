import { Wallet, Transaction, TransactionStatus, TransactionPacket } from '../types';

const STORAGE_KEY_WALLETS = 'offline_upi_wallets';
const STORAGE_KEY_TRANSACTIONS = 'offline_upi_transactions';

// Initial Demo Data
const DEMO_WALLETS: Wallet[] = [
  {
    id: 'wallet_a',
    name: 'Demo User A',
    phoneNumber: '9023456766',
    address: '56766@chain',
    balance: 50,
    pinHash: '1234' // Simple mock hash
  },
  {
    id: 'wallet_b',
    name: 'Demo User B',
    phoneNumber: '9098765432',
    address: '65432@chain',
    balance: 50,
    pinHash: '1234'
  }
];

export const initializeStorage = () => {
  if (!localStorage.getItem(STORAGE_KEY_WALLETS)) {
    localStorage.setItem(STORAGE_KEY_WALLETS, JSON.stringify(DEMO_WALLETS));
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

export const processOfflineTransaction = (packet: TransactionPacket) => {
  const wallets = getWallets();
  const transactions = getTransactions();

  const sender = wallets.find(w => w.phoneNumber === packet.senderPhone);
  // const receiver = wallets.find(w => w.phoneNumber === packet.receiverPhone);

  // Create Transaction Records
  // 1. Sender's Record (Pending, Deducted locally)
  const senderTx: Transaction = {
    id: `tx_${Date.now()}_send`,
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
    id: `tx_${Date.now()}_recv`,
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
            status: TransactionStatus.CONFIRMED,
            hash: generateHash()
          };
        }
        return tx;
      });

      saveWallets(wallets);
      saveTransactions(updatedTransactions);
      resolve(syncCount);
    }, 2000); // Simulate network delay
  });
};

export const topUpWallet = (phoneNumber: string, amount: number) => {
    const wallets = getWallets();
    const transactions = getTransactions();
    const wallet = wallets.find(w => w.phoneNumber === phoneNumber);
    
    if (wallet) {
        wallet.balance += amount;
        const tx: Transaction = {
            id: `tx_${Date.now()}_topup`,
            senderPhone: 'SYSTEM',
            senderAddress: 'UPI_BANK',
            receiverPhone: wallet.phoneNumber,
            receiverAddress: wallet.address,
            amount: amount,
            timestamp: Date.now(),
            status: TransactionStatus.CONFIRMED,
            hash: generateHash(),
            type: 'TOPUP'
        };
        saveWallets(wallets);
        saveTransactions([tx, ...transactions]);
    }
}