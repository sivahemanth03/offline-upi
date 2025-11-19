export enum TransactionStatus {
  PENDING = 'PENDING', // Offline
  CONFIRMED = 'CONFIRMED' // On-Chain
}

export interface Wallet {
  id: string;
  phoneNumber: string;
  address: string;
  balance: number;
  pinHash: string; // Simple simulation
  name: string;
}

export interface Transaction {
  id: string;
  senderPhone: string;
  senderAddress: string;
  receiverPhone: string;
  receiverAddress: string;
  amount: number;
  timestamp: number;
  status: TransactionStatus;
  hash?: string; // Blockchain hash
  type: 'SEND' | 'RECEIVE' | 'TOPUP';
}

export interface TransactionPacket {
  senderPhone: string;
  senderAddress: string;
  receiverPhone: string;
  receiverAddress: string;
  amount: number;
  timestamp: number;
  signature: string; // Mock signature
}

// For the QR Code data
export interface QRProfile {
  phone: string;
  address: string;
}
