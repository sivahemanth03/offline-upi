import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Wallet as WalletIcon, 
  Send, 
  QrCode, 
  History, 
  RefreshCw, 
  Settings, 
  Smartphone, 
  Bluetooth, 
  WifiOff, 
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  LogOut,
  UserCircle,
  Lock,
  ShieldCheck,
  Plus,
  Share2,
  Download,
  Upload,
  Keyboard,
  ArrowLeft,
  Phone,
  CreditCard,
  Landmark,
  Link,
  X
} from 'lucide-react';
import QRCode from 'qrcode';
import { 
  Transaction, 
  Wallet, 
  TransactionStatus, 
  TransactionPacket, 
  QRProfile 
} from './types';
import * as WalletService from './services/walletService';
import * as BackupService from './services/backupService';

// --- Types for App State ---
type View = 'LOGIN' | 'DASHBOARD' | 'SEND' | 'RECEIVE' | 'HISTORY' | 'SETTINGS' | 'BACKUP' | 'DEMO_GUIDE' | 'ADD_MONEY';

// --- Helper Components ---

interface GradientCardProps {
  children: React.ReactNode;
  className?: string;
}

const GradientCard: React.FC<GradientCardProps> = ({ children, className = '' }) => (
  <div className={`bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl ${className}`}>
    {children}
  </div>
);

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  className?: string;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ onClick, children, variant = 'primary', className = '', disabled = false }) => {
  const base = "w-full py-3.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40",
    secondary: "bg-slate-700 text-slate-200 hover:bg-slate-600",
    outline: "border-2 border-slate-600 text-slate-300 hover:border-slate-400",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
    success: "bg-green-500 text-white shadow-lg shadow-green-500/20 hover:bg-green-600"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {children}
    </button>
  );
};

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-2 w-16 transition-colors ${active ? 'text-purple-400' : 'text-slate-500'}`}
  >
    <Icon size={24} className={`mb-1 ${active ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : ''}`} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

interface TransactionItemProps {
  tx: Transaction;
  walletAddress: string;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ tx, walletAddress }) => {
    const isSender = tx.senderAddress === walletAddress;
    const isTopUp = tx.type === 'TOPUP';
    
    return (
        <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isTopUp ? 'bg-green-500/10 text-green-400' : 
                    isSender ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                }`}>
                    {isTopUp ? <Plus size={18} /> : isSender ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                </div>
                <div>
                    <p className="font-bold text-sm text-white">
                        {isTopUp ? (tx.senderAddress === 'UPI_BANK' ? 'Wallet Top-up' : `Added via ${tx.senderAddress}`) : isSender ? `To ${tx.receiverPhone}` : `From ${tx.senderPhone}`}
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {tx.status === TransactionStatus.PENDING ? (
                            <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20">Offline</span>
                        ) : (
                             <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">Chain</span>
                        )}
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className={`font-bold ${isSender && !isTopUp ? 'text-white' : 'text-green-400'}`}>
                    {isSender && !isTopUp ? '-' : '+'} ₹{tx.amount}
                </p>
                {tx.status === TransactionStatus.CONFIRMED && (
                    <div className="flex items-center justify-end gap-1 text-[10px] text-slate-600">
                        <Lock size={8} /> <span>Secured</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- View Components ---

interface LoginViewProps {
  wallets: Wallet[];
  onLogin: (walletId: string) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ wallets, onLogin }) => {
  const [loginStep, setLoginStep] = useState<'PHONE' | 'PIN'>('PHONE');
  const [phoneInput, setPhoneInput] = useState('');
  const [pin, setPin] = useState('');
  const [candidate, setCandidate] = useState<Wallet | null>(null);

  const handlePhoneSubmit = () => {
      const found = wallets.find(w => w.phoneNumber === phoneInput);
      if (found) {
          setCandidate(found);
          setLoginStep('PIN');
          setPin(''); 
      } else {
          alert("Number not found. For demo, use 9023456766 or 9098765432");
      }
  };

  const handlePinSubmit = async () => {
      if (candidate && pin) {
          try {
            const hashedInput = await WalletService.hashPin(pin);
            if (hashedInput === candidate.pinHash) {
                onLogin(candidate.id);
                setPin('');
            } else {
                alert('Incorrect PIN. Try 1234');
            }
          } catch (err) {
            console.error("PIN hashing error", err);
            alert("Error processing PIN");
          }
      }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#0f172a] relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[50%] bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-xs space-y-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-purple-500/30">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            ChainWallet
          </h1>
          <p className="text-slate-400">Offline UPI & Blockchain Ledger</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-2xl">
            
            {loginStep === 'PHONE' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="text-center">
                        <p className="text-white font-bold text-lg">Login</p>
                        <p className="text-slate-400 text-sm">Enter your mobile number</p>
                    </div>

                    <div>
                        <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                              <input 
                                  type="tel" 
                                  value={phoneInput} 
                                  onChange={(e) => setPhoneInput(e.target.value)}
                                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-3 pl-10 text-white outline-none focus:border-purple-500 transition-colors"
                                  placeholder="9023456766"
                              />
                        </div>
                    </div>

                    <Button onClick={handlePhoneSubmit} disabled={phoneInput.length < 10}>
                        Continue
                    </Button>

                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <p className="text-xs text-slate-500 text-center mb-2">Demo Quick Fill</p>
                        <div className="flex gap-2 justify-center">
                            <button onClick={() => setPhoneInput('9023456766')} className="text-xs bg-slate-700/50 hover:bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-slate-600 transition-colors">
                                User A
                            </button>
                            <button onClick={() => setPhoneInput('9098765432')} className="text-xs bg-slate-700/50 hover:bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-slate-600 transition-colors">
                                User B
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loginStep === 'PIN' && candidate && (
                <div className="space-y-6 animate-fade-in">
                    <div className="text-center relative">
                        <button 
                          onClick={() => setLoginStep('PHONE')} 
                          className="absolute left-0 top-0 p-1 text-slate-400 hover:text-white"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <p className="text-sm text-slate-300 mb-1">Welcome back</p>
                        <p className="text-lg font-bold text-white">{candidate.name}</p>
                        <p className="text-xs text-slate-500">{candidate.phoneNumber}</p>
                    </div>

                  <div className="flex justify-center gap-4 mb-2">
                      {[1, 2, 3, 4].map((_, i) => (
                      <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-purple-500 scale-110' : 'bg-slate-700'}`} />
                      ))}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                          <button key={num} onClick={() => setPin(p => (p.length < 4 ? p + num.toString() : p))} className="h-12 w-full rounded-lg bg-slate-700/50 hover:bg-slate-600 text-xl font-bold text-white transition-colors">
                              {num}
                          </button>
                      ))}
                      <div />
                      <button onClick={() => setPin(p => (p.length < 4 ? p + '0' : p))} className="h-12 w-full rounded-lg bg-slate-700/50 hover:bg-slate-600 text-xl font-bold text-white transition-colors">0</button>
                      <button onClick={() => setPin(p => p.slice(0, -1))} className="h-12 w-full rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors">
                          <LogOut size={20} />
                      </button>
                  </div>

                  <Button onClick={handlePinSubmit}>Unlock Wallet</Button>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

interface DashboardViewProps {
  activeWallet: Wallet | undefined;
  walletTransactions: Transaction[];
  pendingCount: number;
  isSyncing: boolean;
  onNavigate: (view: View) => void;
  onSync: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
  activeWallet, 
  walletTransactions, 
  pendingCount, 
  isSyncing,
  onNavigate,
  onSync
}) => (
  <div className="space-y-6 pb-24">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 text-purple-400 font-bold">
              {(activeWallet?.name || '').charAt(0)}
          </div>
          <div>
              <h2 className="font-bold text-white">{activeWallet?.name}</h2>
              <p className="text-xs text-slate-400">{activeWallet?.address}</p>
          </div>
      </div>
      <button onClick={() => onNavigate('SETTINGS')} className="p-2 text-slate-400 hover:text-white">
          <Settings size={20} />
      </button>
    </div>

    <GradientCard className="relative overflow-hidden">
       <div className="relative z-10">
           <p className="text-slate-300 text-sm mb-1">Total Balance</p>
           <h1 className="text-4xl font-bold text-white mb-4">₹ {activeWallet?.balance.toLocaleString()}</h1>
           <div className="flex gap-3">
               <button onClick={() => onNavigate('ADD_MONEY')} className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors">
                   <Plus size={16} /> Add Money
               </button>
               <button onClick={onSync} className={`flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors ${pendingCount > 0 ? 'animate-pulse border border-yellow-500/50' : ''}`}>
                   <RefreshCw size={16} className={`${isSyncing ? 'animate-spin' : ''}`} /> {isSyncing ? 'Syncing...' : 'Sync Chain'}
               </button>
           </div>
       </div>
       <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/30 rounded-full blur-3xl" />
    </GradientCard>

    <div className="grid grid-cols-2 gap-4">
        <button onClick={() => onNavigate('SEND')} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-750 active:scale-95 transition-all group">
            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Send size={24} className="text-blue-400" />
            </div>
            <span className="text-sm font-medium text-slate-300">Send</span>
        </button>
        <button onClick={() => onNavigate('RECEIVE')} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-750 active:scale-95 transition-all group">
            <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <QrCode size={24} className="text-purple-400" />
            </div>
            <span className="text-sm font-medium text-slate-300">Receive</span>
        </button>
    </div>

    <div>
      <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white">Recent Transactions</h3>
          <button onClick={() => onNavigate('HISTORY')} className="text-xs text-purple-400 hover:text-purple-300">View All</button>
      </div>
      <div className="space-y-3">
          {walletTransactions.slice(0, 3).map(tx => (
              <TransactionItem key={tx.id} tx={tx} walletAddress={activeWallet?.address || ''} />
          ))}
          {walletTransactions.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">No transactions yet</div>
          )}
      </div>
    </div>

    {pendingCount > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-center gap-3">
            <WifiOff className="text-yellow-500" size={20} />
            <div>
                <p className="text-sm font-bold text-yellow-500">{pendingCount} Offline Pending</p>
                <p className="text-xs text-yellow-500/80">Tap 'Sync Chain' to finalize on blockchain.</p>
            </div>
        </div>
    )}
  </div>
);

interface AddMoneyViewProps {
  activeWallet: Wallet | undefined;
  onNavigate: (view: View) => void;
  onAddMoney: (amount: number, source: string) => void;
}

const AddMoneyView: React.FC<AddMoneyViewProps> = ({ activeWallet, onNavigate, onAddMoney }) => {
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  
  // Permission Simulation
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [connectedApps, setConnectedApps] = useState<string[]>([]);
  const [pendingApp, setPendingApp] = useState<string | null>(null);

  // Card Modal State
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');

  const handleAppSelect = (appName: string) => {
     if (!amount || Number(amount) <= 0) {
          alert("Please enter a valid amount");
          return;
      }

      if (connectedApps.includes(appName)) {
          startPayment(appName);
      } else {
          setPendingApp(appName);
          setShowPermissionDialog(true);
      }
  };

  const confirmPermission = () => {
      if (pendingApp) {
          setConnectedApps(prev => [...prev, pendingApp]);
          setShowPermissionDialog(false);
          startPayment(pendingApp);
          setPendingApp(null);
      }
  };

  const startPayment = (source: string) => {
      setSelectedApp(source);
      setProcessing(true);
      setTimeout(() => {
          onAddMoney(Number(amount), source);
      }, 2500);
  };

  const handleCardPay = () => {
      if (!cardNumber || !expiry || !cvv || !cardName) {
          alert("Please fill in all card details");
          return;
      }
      if (cardNumber.length < 16) {
          alert("Invalid card number");
          return;
      }
      setShowCardModal(false);
      const last4 = cardNumber.slice(-4);
      startPayment(`Card ****${last4}`);
  };

  const upiApps = [
      { name: 'Google Pay', color: 'bg-blue-500', icon: <CreditCard size={20} /> },
      { name: 'PhonePe', color: 'bg-purple-600', icon: <Smartphone size={20} /> },
      { name: 'Paytm', color: 'bg-cyan-500', icon: <Landmark size={20} /> },
      { name: 'BHIM', color: 'bg-orange-500', icon: <ShieldCheck size={20} /> },
  ];

  if (processing) {
      return (
          <div className="h-full flex flex-col items-center justify-center space-y-6 animate-fade-in">
              <div className="relative">
                  <div className="w-20 h-20 border-4 border-slate-700 rounded-full" />
                  <div className="absolute top-0 left-0 w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">₹</div>
              </div>
              <div className="text-center">
                  <h3 className="text-xl font-bold text-white">Processing Payment</h3>
                  <p className="text-slate-400 mt-1">Requesting money from {selectedApp}...</p>
                  <p className="text-xs text-slate-500 mt-4">Do not close this window</p>
              </div>
          </div>
      );
  }

  return (
      <div className="h-full flex flex-col relative">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <button onClick={() => onNavigate('DASHBOARD')} className="text-slate-400 hover:text-white"><ArrowLeft /></button> 
              Add Money
          </h2>

          <div className="flex-1 overflow-y-auto space-y-8">
               <div>
                   <label className="text-slate-400 text-sm ml-1">Enter Amount</label>
                   <div className="relative mt-2">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-2xl font-bold">₹</span>
                       <input 
                          type="number" 
                          value={amount} 
                          onChange={(e) => setAmount(e.target.value)}
                          autoFocus
                          className="w-full bg-transparent border-b-2 border-slate-600 py-4 pl-10 text-5xl font-bold text-white outline-none focus:border-purple-500 transition-colors"
                          placeholder="0"
                       />
                   </div>
                   <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                       {[100, 500, 1000, 2000].map(val => (
                           <button 
                              key={val}
                              onClick={() => setAmount(val.toString())}
                              className="px-4 py-2 bg-slate-800 rounded-full border border-slate-700 text-sm font-medium text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50 transition-colors whitespace-nowrap"
                           >
                               + ₹{val}
                           </button>
                       ))}
                   </div>
               </div>

               <div>
                   <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                       <Smartphone size={18} className="text-slate-400" />
                       Pay via UPI App
                   </h3>
                   <div className="grid grid-cols-2 gap-3">
                       {upiApps.map(app => (
                           <button 
                              key={app.name}
                              onClick={() => handleAppSelect(app.name)}
                              disabled={!amount}
                              className={`p-4 rounded-xl border border-slate-700 flex items-center gap-3 hover:bg-slate-800 transition-all active:scale-95 ${!amount ? 'opacity-50 cursor-not-allowed' : ''}`}
                           >
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${app.color}`}>
                                   {app.icon}
                               </div>
                               <div className="text-left">
                                   <span className="text-slate-200 font-medium text-sm block">{app.name}</span>
                                   {connectedApps.includes(app.name) && (
                                       <span className="text-[10px] text-green-400 flex items-center gap-1"><CheckCircle2 size={8} /> Linked</span>
                                   )}
                               </div>
                           </button>
                       ))}
                   </div>
               </div>

               <div>
                  <div className="flex items-center gap-4 my-2">
                     <div className="h-px bg-slate-700 flex-1" />
                     <span className="text-slate-500 text-xs">OR PAY USING</span>
                     <div className="h-px bg-slate-700 flex-1" />
                  </div>
                   
                   <button 
                      onClick={() => {
                          if (!amount || Number(amount) <= 0) {
                              alert("Please enter a valid amount");
                              return;
                          }
                          setShowCardModal(true);
                      }}
                      disabled={!amount}
                      className={`w-full p-4 rounded-xl border border-slate-700 flex items-center gap-3 hover:bg-slate-800 transition-all active:scale-95 ${!amount ? 'opacity-50 cursor-not-allowed' : ''}`}
                   >
                       <div className="w-10 h-10 rounded-full flex items-center justify-center bg-pink-600 text-white font-bold text-sm">
                           <CreditCard size={20} />
                       </div>
                       <div className="text-left">
                           <span className="text-slate-200 font-medium text-sm block">Credit / Debit Card</span>
                           <span className="text-[10px] text-slate-500">Visa, Mastercard, RuPay</span>
                       </div>
                   </button>
               </div>

               <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex items-start gap-3">
                   <div className="mt-1 text-slate-400"><ShieldCheck size={18} /></div>
                   <div>
                       <p className="text-xs text-slate-300 font-medium">Secure Transaction</p>
                       <p className="text-[10px] text-slate-500 mt-1">
                           Your payment is processed securely by your selected provider. ChainWallet only records the confirmed credit.
                       </p>
                   </div>
               </div>
          </div>

          {/* Permission Modal */}
          {showPermissionDialog && pendingApp && (
              <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in">
                  <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl w-full max-w-xs shadow-2xl">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mb-4 mx-auto">
                          <Link size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-white text-center mb-2">Give Access?</h3>
                      <p className="text-slate-400 text-sm text-center mb-6">
                          Allow <b>ChainWallet</b> to link with your <b>{pendingApp}</b> account to process payments.
                      </p>
                      <div className="space-y-3">
                          <Button onClick={confirmPermission} variant="primary">Allow Access</Button>
                          <Button onClick={() => setShowPermissionDialog(false)} variant="secondary">Deny</Button>
                      </div>
                  </div>
              </div>
          )}

          {/* Card Modal */}
          {showCardModal && (
              <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in">
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full shadow-2xl overflow-hidden relative">
                      <button onClick={() => setShowCardModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                          <X size={24} />
                      </button>
                      
                      <div className="p-6 border-b border-slate-700">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                              <CreditCard className="text-pink-500" size={20} />
                              Enter Card Details
                          </h3>
                      </div>
                      
                      <div className="p-6 space-y-4">
                          <div>
                              <label className="text-xs text-slate-400 ml-1 mb-1 block">Card Number</label>
                              <input 
                                  type="text" 
                                  placeholder="0000 0000 0000 0000"
                                  maxLength={19}
                                  value={cardNumber}
                                  onChange={(e) => {
                                    const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                                    setCardNumber(v);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white tracking-widest outline-none focus:border-pink-500 transition-colors"
                              />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="text-xs text-slate-400 ml-1 mb-1 block">Expiry Date</label>
                                  <input 
                                      type="text" 
                                      placeholder="MM/YY"
                                      maxLength={5}
                                      value={expiry}
                                      onChange={(e) => setExpiry(e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-pink-500 transition-colors"
                                  />
                              </div>
                              <div>
                                  <label className="text-xs text-slate-400 ml-1 mb-1 block">CVV</label>
                                  <input 
                                      type="password" 
                                      placeholder="123"
                                      maxLength={3}
                                      value={cvv}
                                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                                      className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-pink-500 transition-colors"
                                  />
                              </div>
                          </div>

                          <div>
                              <label className="text-xs text-slate-400 ml-1 mb-1 block">Cardholder Name</label>
                              <input 
                                  type="text" 
                                  placeholder="Name on Card"
                                  value={cardName}
                                  onChange={(e) => setCardName(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-pink-500 transition-colors"
                              />
                          </div>
                      </div>

                      <div className="p-6 pt-2">
                          <Button onClick={handleCardPay} variant="primary">
                              Pay ₹{amount} Securely
                          </Button>
                          <div className="flex justify-center gap-2 mt-4 opacity-50">
                               <div className="w-8 h-5 bg-white rounded" />
                               <div className="w-8 h-5 bg-white rounded" />
                               <div className="w-8 h-5 bg-white rounded" />
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );
};

interface SendViewProps {
  activeWallet: Wallet | undefined;
  wallets: Wallet[];
  activeWalletId: string;
  onNavigate: (view: View) => void;
  refreshData: () => void;
}

const SendView: React.FC<SendViewProps> = ({ activeWallet, wallets, activeWalletId, onNavigate, refreshData }) => {
  const [mode, setMode] = useState<'QR' | 'BLUETOOTH' | 'MANUAL'>('QR');
  const [step, setStep] = useState<'METHOD' | 'SCAN' | 'MANUAL_INPUT' | 'AMOUNT' | 'PROCESSING' | 'SUCCESS'>('METHOD');
  const [amount, setAmount] = useState('');
  const [receiver, setReceiver] = useState<Wallet | null>(null);
  const [manualInput, setManualInput] = useState('');

  useEffect(() => {
      if (step === 'SCAN') {
          const timer = setTimeout(() => {
              const other = wallets.find(w => w.id !== activeWalletId);
              if (other) {
                  setReceiver(other);
                  setStep('AMOUNT');
              }
          }, 2000);
          return () => clearTimeout(timer);
      }
  }, [step, wallets, activeWalletId]);

  const handleManualSubmit = () => {
      const term = manualInput.trim();
      const target = wallets.find(w => 
          w.address.toLowerCase() === term.toLowerCase() || 
          w.phoneNumber === term
      );
      
      if (target) {
           if (target.id === activeWalletId) {
              alert("You cannot send money to yourself.");
              return;
          }
          setReceiver(target);
          setStep('AMOUNT');
      } else {
          alert("Recipient not found. For this demo, please use one of the existing wallet addresses (e.g., 56766@chain or 65432@chain).");
      }
  };

  const handleSend = () => {
      if (!amount || !receiver || !activeWallet) return;
      
      setStep('PROCESSING');
      
      const packet: TransactionPacket = {
          senderPhone: activeWallet.phoneNumber,
          senderAddress: activeWallet.address,
          receiverPhone: receiver.phoneNumber,
          receiverAddress: receiver.address,
          amount: Number(amount),
          timestamp: Date.now(),
          signature: 'offline_sig_' + Math.random().toString(36).substring(7)
      };

      setTimeout(() => {
          WalletService.processOfflineTransaction(packet);
          refreshData();
          setStep('SUCCESS');
      }, 1500);
  };

  return (
      <div className="h-full flex flex-col">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <button onClick={() => {
                  if (step === 'METHOD') onNavigate('DASHBOARD');
                  else setStep('METHOD');
              }} className="text-slate-400 hover:text-white"><ArrowDownLeft className="rotate-90" /></button> 
              Send Money
          </h2>

          {step === 'METHOD' && (
              <div className="space-y-4 flex-1 overflow-y-auto">
                  <button onClick={() => { setMode('QR'); setStep('SCAN'); }} className="w-full bg-slate-800 border border-slate-700 p-6 rounded-2xl flex items-center gap-4 hover:border-purple-500/50 transition-all group text-left">
                      <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center group-hover:bg-purple-500 text-white transition-colors">
                          <QrCode size={24} />
                      </div>
                      <div>
                          <h3 className="font-bold text-white text-lg">Scan QR Code</h3>
                          <p className="text-slate-400 text-sm">Scan receiver's phone QR</p>
                      </div>
                  </button>

                  <button onClick={() => { setMode('BLUETOOTH'); setStep('SCAN'); }} className="w-full bg-slate-800 border border-slate-700 p-6 rounded-2xl flex items-center gap-4 hover:border-blue-500/50 transition-all group text-left relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-blue-500 text-xs font-bold text-white px-2 py-1 rounded-bl-lg">OFFLINE</div>
                      <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center group-hover:bg-blue-500 text-white transition-colors">
                          <Bluetooth size={24} />
                      </div>
                      <div>
                          <h3 className="font-bold text-white text-lg">Bluetooth / Nearby</h3>
                          <p className="text-slate-400 text-sm">No internet required</p>
                      </div>
                  </button>

                  <button onClick={() => { setMode('MANUAL'); setStep('MANUAL_INPUT'); }} className="w-full bg-slate-800 border border-slate-700 p-6 rounded-2xl flex items-center gap-4 hover:border-green-500/50 transition-all group text-left">
                      <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center group-hover:bg-green-500 text-white transition-colors">
                          <Keyboard size={24} />
                      </div>
                      <div>
                          <h3 className="font-bold text-white text-lg">Enter Address</h3>
                          <p className="text-slate-400 text-sm">Phone number or Wallet ID</p>
                      </div>
                  </button>
              </div>
          )}

          {step === 'SCAN' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="relative w-64 h-64 border-2 border-purple-500/50 rounded-3xl flex items-center justify-center overflow-hidden bg-black/50">
                      <div className="absolute inset-0 border-t-2 border-purple-500 animate-[scan_2s_ease-in-out_infinite] top-0" />
                      {mode === 'QR' ? <QrCode size={64} className="text-slate-600 opacity-50" /> : <Bluetooth size={64} className="text-blue-500 opacity-50 animate-pulse" />}
                  </div>
                  <p className="text-slate-300 animate-pulse">
                      {mode === 'QR' ? 'Align QR code within frame...' : 'Searching for nearby wallets...'}
                  </p>
              </div>
          )}

          {step === 'MANUAL_INPUT' && (
              <div className="flex-1 space-y-6">
                  <div>
                      <label className="text-slate-400 text-sm ml-1">Recipient</label>
                      <input 
                          type="text" 
                          value={manualInput} 
                          onChange={(e) => setManualInput(e.target.value)}
                          autoFocus
                          className="w-full bg-slate-800 border border-slate-600 rounded-xl p-4 mt-2 text-white outline-none focus:border-purple-500 transition-colors"
                          placeholder="e.g. 9023456766 or 56766@chain"
                      />
                      <p className="text-xs text-slate-500 mt-2 ml-1">
                          Enter the 10-digit phone number or wallet address.
                      </p>
                  </div>

                  <Button onClick={handleManualSubmit} disabled={!manualInput}>
                      Continue
                  </Button>
              </div>
          )}

          {step === 'AMOUNT' && receiver && (
              <div className="flex-1 space-y-6">
                   <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold">
                          {receiver.name.charAt(0)}
                      </div>
                      <div>
                          <p className="text-xs text-slate-400">Sending to</p>
                          <p className="font-bold text-white">{receiver.name}</p>
                          <p className="text-xs text-slate-500">{receiver.address}</p>
                      </div>
                   </div>

                   <div>
                       <label className="text-slate-400 text-sm ml-1">Amount</label>
                       <div className="relative mt-2">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-bold">₹</span>
                           <input 
                              type="number" 
                              value={amount} 
                              onChange={(e) => setAmount(e.target.value)}
                              autoFocus
                              className="w-full bg-transparent border-b-2 border-slate-600 py-4 pl-10 text-4xl font-bold text-white outline-none focus:border-purple-500 transition-colors"
                              placeholder="0"
                           />
                       </div>
                       <p className="text-right text-xs text-slate-500 mt-2">Balance: ₹{activeWallet?.balance}</p>
                   </div>

                   <Button onClick={handleSend} disabled={!amount || Number(amount) <= 0}>
                       {mode === 'BLUETOOTH' ? 'Send Offline Packet' : 'Confirm Transfer'}
                   </Button>
              </div>
          )}

          {step === 'PROCESSING' && (
              <div className="flex-1 flex flex-col items-center justify-center">
                   <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
                   <h3 className="text-xl font-bold text-white">Sending...</h3>
                   <p className="text-slate-400">Creating offline signed packet</p>
              </div>
          )}

          {step === 'SUCCESS' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 mb-2">
                      <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Sent Successfully!</h3>
                  <p className="text-slate-400 max-w-xs">
                      Transaction is stored locally and will sync to the blockchain when internet is available.
                  </p>
                  <div className="w-full pt-8">
                      <Button onClick={() => onNavigate('DASHBOARD')} variant="secondary">Done</Button>
                  </div>
              </div>
          )}
      </div>
  );
};

interface ReceiveViewProps {
  activeWallet: Wallet | undefined;
  onNavigate: (view: View) => void;
}

const ReceiveView: React.FC<ReceiveViewProps> = ({ activeWallet, onNavigate }) => {
    const [qrSrc, setQrSrc] = useState('');

    useEffect(() => {
        if (activeWallet) {
            const qrData: QRProfile = { phone: activeWallet.phoneNumber, address: activeWallet.address };
            QRCode.toDataURL(JSON.stringify(qrData), { 
                width: 256, 
                margin: 2, 
                color: { dark: '#000000', light: '#ffffff' } 
            }).then(setQrSrc).catch(err => console.error(err));
        }
    }, [activeWallet]);

    if (!activeWallet) return null;

    return (
      <div className="h-full flex flex-col items-center pt-6">
           <h2 className="text-xl font-bold text-white mb-8 w-full text-left flex items-center gap-2">
              <button onClick={() => onNavigate('DASHBOARD')} className="text-slate-400 hover:text-white"><ArrowDownLeft className="rotate-90" /></button> 
              Receive Money
          </h2>

          <div className="bg-white p-4 rounded-3xl shadow-2xl shadow-purple-500/20 mb-8">
              {qrSrc ? (
                <img src={qrSrc} alt="QR Code" className="w-64 h-64 rounded-xl mix-blend-multiply" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-slate-400">Generating...</div>
              )}
          </div>

          <div className="text-center space-y-1 mb-8">
              <h3 className="text-2xl font-bold text-white">{activeWallet.name}</h3>
              <p className="text-purple-400 font-mono bg-purple-500/10 px-3 py-1 rounded-full inline-block">{activeWallet.address}</p>
              <p className="text-slate-500 text-sm mt-2">{activeWallet.phoneNumber}</p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl text-sm text-slate-400 text-center max-w-xs border border-slate-700">
              <p>Scanning works offline. Show this code to a sender nearby.</p>
          </div>
      </div>
    );
};

interface HistoryViewProps {
  walletTransactions: Transaction[];
  activeWalletAddress: string;
  onNavigate: (view: View) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ walletTransactions, activeWalletAddress, onNavigate }) => (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <button onClick={() => onNavigate('DASHBOARD')} className="text-slate-400 hover:text-white"><ArrowDownLeft className="rotate-90" /></button> 
          Transaction History
      </h2>

      <div className="flex-1 overflow-y-auto -mx-4 px-4 space-y-3">
          {walletTransactions.map(tx => (
              <TransactionItem key={tx.id} tx={tx} walletAddress={activeWalletAddress} />
          ))}
           {walletTransactions.length === 0 && (
              <div className="text-center py-20 text-slate-500">No history available</div>
          )}
      </div>
    </div>
);

interface SettingsViewProps {
  activeWallet: Wallet | undefined;
  onNavigate: (view: View) => void;
  onLogout: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ activeWallet, onNavigate, onLogout }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
      const p = prompt("Enter a PIN to encrypt your backup file:");
      if (!p) return;
      try {
          const backupData = await BackupService.createBackup(p);
          const blob = new Blob([backupData], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `chainwallet_backup_${Date.now()}.enc`;
          a.click();
          URL.revokeObjectURL(url);
      } catch (e) {
          alert("Backup failed.");
          console.error(e);
      }
  };

  const handleRestoreClick = () => {
      fileInputRef.current?.click();
  };

  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
          const content = event.target?.result as string;
          const p = prompt("Enter the PIN to decrypt this backup:");
          if (!p) return;
          
          const success = await BackupService.restoreBackup(content, p);
          if (success) {
              alert("Wallet restored successfully! Reloading...");
              window.location.reload();
          } else {
              alert("Restore failed. Invalid PIN or corrupted file.");
          }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = ''; 
  };

  return (
    <div className="h-full">
         <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <button onClick={() => onNavigate('DASHBOARD')} className="text-slate-400 hover:text-white"><ArrowDownLeft className="rotate-90" /></button> 
              Settings
          </h2>

          <div className="space-y-4">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {(activeWallet?.name || '').charAt(0)}
                  </div>
                  <div>
                      <h3 className="text-white font-bold">{activeWallet?.name}</h3>
                      <p className="text-slate-400 text-sm">{activeWallet?.phoneNumber}</p>
                  </div>
              </div>

              <button onClick={() => onNavigate('DEMO_GUIDE')} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3 hover:bg-slate-750 transition-colors">
                  <Smartphone className="text-purple-400" />
                  <span className="text-slate-200">Demo Guide & Info</span>
              </button>

              <div className="grid grid-cols-2 gap-4">
                   <button onClick={handleBackup} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-slate-750 transition-colors">
                      <Download className="text-green-400" />
                      <span className="text-xs font-bold text-slate-200">Backup (AES)</span>
                  </button>

                  <button onClick={handleRestoreClick} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-slate-750 transition-colors">
                      <Upload className="text-orange-400" />
                      <span className="text-xs font-bold text-slate-200">Restore</span>
                      <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept=".enc" 
                          onChange={handleRestoreFileChange} 
                      />
                  </button>
              </div>

              <button onClick={onLogout} className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 mt-8 hover:bg-red-500/20 transition-colors">
                  <LogOut className="text-red-400" />
                  <span className="text-red-400">Log Out</span>
              </button>
          </div>
    </div>
  );
};

interface DemoGuideViewProps {
  onNavigate: (view: View) => void;
}

const DemoGuideView: React.FC<DemoGuideViewProps> = ({ onNavigate }) => (
    <div className="h-full flex flex-col">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <button onClick={() => onNavigate('SETTINGS')} className="text-slate-400 hover:text-white"><ArrowDownLeft className="rotate-90" /></button> 
              Demo Explanation
          </h2>
        <div className="flex-1 overflow-y-auto text-slate-300 space-y-6 pr-2">
            <section>
                <h3 className="text-white font-bold text-lg mb-2">Phone Number Identity</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Wallets are derived deterministically from the 10-digit phone number. The address <code className="text-purple-400">56766@chain</code> is simply the last 5 digits + our chain suffix. This makes onboarding instant.
                </p>
            </section>
             <section>
                <h3 className="text-white font-bold text-lg mb-2">Offline "Chain" Method</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                    When sending offline (Bluetooth/QR), the sender signs a packet and deducts their balance <b>optimistically</b>. The packet is stored in the receiver's "Pending" box. The transaction is valid but not yet "Confirmed" on the global ledger.
                </p>
            </section>
            <section>
                <h3 className="text-white font-bold text-lg mb-2">Blockchain Sync</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Once internet is restored, the <span className="text-yellow-500 font-bold">Sync</span> button pushes all pending packets to the validator. The validator confirms the signatures and permanently records them with a 64-char hash.
                </p>
            </section>
             <section>
                <h3 className="text-white font-bold text-lg mb-2">AES Backup</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                    The Backup feature uses Web Crypto API to encrypt the full wallet state with AES-GCM (256-bit) derived from your PIN using PBKDF2.
                </p>
            </section>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <h4 className="text-white font-bold text-sm mb-2">Demo Instructions</h4>
                <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                    <li>Login with PIN: <b>1234</b></li>
                    <li>User A starts with ₹50</li>
                    <li>Switch to User B in Settings</li>
                    <li>Use "Send" &gt; "Bluetooth" to simulate offline transfer</li>
                    <li>See "Pending" status appear</li>
                    <li>Click "Sync Chain" to finalize</li>
                </ul>
            </div>
        </div>
    </div>
);

// --- Main App Component ---

export default function App() {
  // State
  const [currentView, setCurrentView] = useState<View>('LOGIN');
  const [activeWalletId, setActiveWalletId] = useState<string>('');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Refresh data
  const refreshData = () => {
    setWallets(WalletService.getWallets());
    setTransactions(WalletService.getTransactions());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const activeWallet = useMemo(() => wallets.find(w => w.id === activeWalletId), [wallets, activeWalletId]);
  const walletTransactions = useMemo(() => {
      return transactions.filter(t => 
        t.senderPhone === activeWallet?.phoneNumber || 
        t.receiverPhone === activeWallet?.phoneNumber
      ).sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, activeWallet]);

  const pendingCount = walletTransactions.filter(t => t.status === TransactionStatus.PENDING).length;

  // --- Actions ---

  const handleSync = async () => {
    setIsSyncing(true);
    const count = await WalletService.syncBlockchain();
    setIsSyncing(false);
    refreshData();
    alert(`Synced ${count} transactions to the blockchain ledger.`);
  };

  const handleAddMoney = (amount: number, source: string) => {
      if (!activeWallet) return;
      WalletService.topUpWallet(activeWallet.phoneNumber, amount, source);
      refreshData();
      setCurrentView('DASHBOARD');
      alert(`Successfully added ₹${amount} via ${source}`);
  };

  const handleLogout = () => {
      setActiveWalletId('');
      setCurrentView('LOGIN');
  };

  const handleLogin = (id: string) => {
      setActiveWalletId(id);
      setCurrentView('DASHBOARD');
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex justify-center">
       <div className="w-full max-w-md h-[100dvh] bg-[#0f172a] flex flex-col relative shadow-2xl overflow-hidden">
          
          <main className="flex-1 p-6 overflow-hidden relative z-10">
             {currentView === 'LOGIN' && (
                 <LoginView wallets={wallets} onLogin={handleLogin} />
             )}
             {currentView === 'DASHBOARD' && (
                 <DashboardView 
                    activeWallet={activeWallet} 
                    walletTransactions={walletTransactions}
                    pendingCount={pendingCount}
                    isSyncing={isSyncing}
                    onNavigate={setCurrentView}
                    onSync={handleSync}
                 />
             )}
             {currentView === 'ADD_MONEY' && (
                 <AddMoneyView
                    activeWallet={activeWallet}
                    onNavigate={setCurrentView}
                    onAddMoney={handleAddMoney}
                 />
             )}
             {currentView === 'SEND' && (
                 <SendView 
                    activeWallet={activeWallet}
                    wallets={wallets}
                    activeWalletId={activeWalletId}
                    onNavigate={setCurrentView}
                    refreshData={refreshData}
                 />
             )}
             {currentView === 'RECEIVE' && (
                 <ReceiveView 
                    activeWallet={activeWallet}
                    onNavigate={setCurrentView}
                 />
             )}
             {currentView === 'HISTORY' && (
                 <HistoryView 
                    walletTransactions={walletTransactions}
                    activeWalletAddress={activeWallet?.address || ''}
                    onNavigate={setCurrentView}
                 />
             )}
             {currentView === 'SETTINGS' && (
                 <SettingsView 
                    activeWallet={activeWallet}
                    onNavigate={setCurrentView}
                    onLogout={handleLogout}
                 />
             )}
             {currentView === 'DEMO_GUIDE' && (
                 <DemoGuideView 
                    onNavigate={setCurrentView}
                 />
             )}
          </main>

          {currentView !== 'LOGIN' && (
              <nav className="bg-slate-900/80 backdrop-blur-lg border-t border-slate-800 px-6 py-2 flex justify-between items-center pb-6 z-20">
                  <NavItem icon={WalletIcon} label="Home" active={currentView === 'DASHBOARD' || currentView === 'ADD_MONEY'} onClick={() => setCurrentView('DASHBOARD')} />
                  <NavItem icon={History} label="History" active={currentView === 'HISTORY'} onClick={() => setCurrentView('HISTORY')} />
                  
                  <div className="-mt-8 bg-purple-600 p-1 rounded-full shadow-lg shadow-purple-500/40">
                       <button onClick={() => setCurrentView('SEND')} className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                           <Send size={20} className="ml-0.5 mt-0.5" />
                       </button>
                  </div>

                  <NavItem icon={RefreshCw} label="Sync" active={isSyncing} onClick={handleSync} />
                  <NavItem icon={Settings} label="Settings" active={currentView === 'SETTINGS'} onClick={() => setCurrentView('SETTINGS')} />
              </nav>
          )}
       </div>
    </div>
  );
}