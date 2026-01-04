import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowLeft01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  WalletAdd01Icon,
  WalletRemove01Icon,
  Invoice01Icon,
  CreditCardIcon,
  Calendar01Icon,
  ViewIcon,
  ViewOffIcon
} from 'hugeicons-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, getUserWallet } from '../lib/supabase'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'

interface Transaction {
  id: string
  type: 'payment' | 'earning' | 'withdrawal' | 'refund' | 'fee'
  amount: number
  description: string
  payment_method?: string
  status: 'pending' | 'completed' | 'failed'
  created_at: string
  order_id?: string
}

interface Wallet {
  id: string
  balance: number
  pending_balance: number
  total_earned: number
  total_spent: number
}

export const Wallet: React.FC = () => {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<Wallet | null>(() => {
    const cached = localStorage.getItem('wallet_data')
    return cached ? JSON.parse(cached) : null
  })
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const cached = localStorage.getItem('transactions_data')
    return cached ? JSON.parse(cached) : []
  })
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [showBalance, setShowBalance] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [showTopUp, setShowTopUp] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showAllTransactions, setShowAllTransactions] = useState(false)

  // Set up Realtime subscriptions with auto-reconnection
  useRealtimeSubscription({
    channelName: `wallet-updates-${user?.id}`,
    table: 'wallets',
    filter: `user_id=eq.${user?.id}`,
    onUpdate: loadWalletData,
    enabled: !!user?.id
  })

  useRealtimeSubscription({
    channelName: `transactions-updates-${user?.id}`,
    table: 'transactions',
    filter: `user_id=eq.${user?.id}`,
    onUpdate: loadWalletData,
    enabled: !!user?.id
  })

  useEffect(() => {
    if (user?.id) {
      loadWalletData()
    }
  }, [user?.id])

  const loadWalletData = async () => {
    if (!user) return

    setLoading(true)
    try {
      const [walletData, transactionsData] = await Promise.all([
        getUserWallet(user.id),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
      ])

      setWallet(walletData)
      setTransactions(transactionsData.data || [])
      localStorage.setItem('wallet_data', JSON.stringify(walletData))
      localStorage.setItem('transactions_data', JSON.stringify(transactionsData.data || []))
      setDataLoaded(true)
    } catch (error) {
      console.error('Error loading wallet data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTopUp = async () => {
    if (!topUpAmount || parseFloat(topUpAmount) <= 0) return

    setProcessing(true)
    try {
      const amount = parseFloat(topUpAmount)
      
      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: user!.id,
            type: 'payment',
            amount: amount,
            description: 'Wallet top-up via mobile money',
            payment_method: 'mobile_money',
            status: 'completed'
          }
        ])

      if (transactionError) throw transactionError

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ 
          balance: (wallet?.balance || 0) + amount,
          total_earned: (wallet?.total_earned || 0) + amount
        })
        .eq('user_id', user!.id)

      if (walletError) throw walletError

      // Reload data
      await loadWalletData()
      setTopUpAmount('')
      setShowTopUp(false)
    } catch (error) {
      console.error('Error topping up wallet:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return
    if (parseFloat(withdrawAmount) > (wallet?.balance || 0)) return

    setProcessing(true)
    try {
      const amount = parseFloat(withdrawAmount)
      
      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: user!.id,
            type: 'withdrawal',
            amount: amount,
            description: 'Wallet withdrawal to mobile money',
            payment_method: 'mobile_money',
            status: 'pending'
          }
        ])

      if (transactionError) throw transactionError

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ 
          balance: (wallet?.balance || 0) - amount,
          pending_balance: (wallet?.pending_balance || 0) + amount,
          total_spent: (wallet?.total_spent || 0) + amount
        })
        .eq('user_id', user!.id)

      if (walletError) throw walletError

      // Reload data
      await loadWalletData()
      setWithdrawAmount('')
      setShowWithdraw(false)
    } catch (error) {
      console.error('Error withdrawing from wallet:', error)
    } finally {
      setProcessing(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'payment':
      case 'earning':
        return (
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <ArrowDown01Icon size={20} color="#059669" />
          </div>
        )
      case 'withdrawal':
      case 'fee':
        return (
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <ArrowUp01Icon size={20} color="#DC2626" />
          </div>
        )
      case 'refund':
        return (
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <ArrowDown01Icon size={20} color="#2563EB" />
          </div>
        )
      default:
        return (
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Invoice01Icon size={20} color="#6B7280" />
          </div>
        )
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'payment':
      case 'earning':
      case 'refund':
        return 'text-green-600'
      case 'withdrawal':
      case 'fee':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <div className="flex items-center justify-center mb-6">
          <h1 className="text-xl font-semibold">Wallet</h1>
        </div>

        {/* Balance Display */}
        <div className="text-center mb-4">
          <p className="text-gray-600 text-sm mb-2">Total Balance</p>
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-4xl font-bold text-gray-900">
              GH₵ {showBalance ? (wallet?.balance || 0).toFixed(2) : '••••••••'}
            </h2>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              {showBalance ? (
                <ViewIcon size={24} color="#6B7280" />
              ) : (
                <ViewOffIcon size={24} color="#6B7280" />
              )}
            </button>
          </div>
        </div>

        {/* Wallet Card */}
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-6 text-white shadow-xl mb-6">
          <div className="flex items-start justify-between mb-12">
            <div>
              <p className="text-indigo-100 text-sm mb-1">Card Number</p>
              <p className="text-white font-mono text-lg tracking-wider">
                {showBalance ? '**** **** **** 1000' : '**** **** **** ****'}
              </p>
            </div>
            <div className="text-right">
              <svg width="50" height="32" viewBox="0 0 50 32" fill="none">
                <rect width="50" height="32" rx="4" fill="white" fillOpacity="0.2"/>
                <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">VISA</text>
              </svg>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-indigo-100 text-xs mb-1">Card Holder</p>
              <p className="text-white font-medium">{user?.user_metadata?.name || 'FillUp User'}</p>
            </div>
            <div className="text-right">
              <p className="text-indigo-100 text-xs mb-1">Expires</p>
              <p className="text-white font-medium">12/28</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => setShowTopUp(true)}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <WalletAdd01Icon size={24} color="#059669" />
            </div>
            <span className="text-xs font-medium text-gray-700">Top Up</span>
          </button>

          <button
            onClick={() => setShowWithdraw(true)}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <WalletRemove01Icon size={24} color="#DC2626" />
            </div>
            <span className="text-xs font-medium text-gray-700">Withdraw</span>
          </button>

          <button className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <CreditCardIcon size={24} color="#2563EB" />
            </div>
            <span className="text-xs font-medium text-gray-700">Cards</span>
          </button>

          <button className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Invoice01Icon size={24} color="#9333EA" />
            </div>
            <span className="text-xs font-medium text-gray-700">History</span>
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
          {transactions.length > 5 && (
            <button 
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="text-sm text-green-600 font-medium"
            >
              {showAllTransactions ? 'Show Less' : 'View All'}
            </button>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <Invoice01Icon size={48} color="#D1D5DB" className="mx-auto mb-4" />
            <p className="text-gray-600">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(showAllTransactions ? transactions : transactions.slice(0, 5)).map((transaction) => (
              <div key={transaction.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  {getTransactionIcon(transaction.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{transaction.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <Calendar01Icon size={12} color="#6B7280" />
                      <span>{new Date(transaction.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>•</span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        transaction.status === 'completed' ? 'bg-green-100 text-green-700' :
                        transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                      {transaction.type === 'withdrawal' || transaction.type === 'fee' ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
                    </p>
                    {transaction.payment_method && (
                      <p className="text-xs text-gray-500 capitalize mt-1">
                        {transaction.payment_method.replace('_', ' ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Up Modal */}
      {showTopUp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-6">Top Up Wallet</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (GHS)
              </label>
              <input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[50, 100, 200].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setTopUpAmount(amount.toString())}
                  className="py-3 px-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors font-medium"
                >
                  ₵{amount}
                </button>
              ))}
            </div>

            <div className="bg-blue-50 p-4 rounded-xl mb-6">
              <p className="text-sm text-blue-800">
                <strong>Mobile Money:</strong> You'll be redirected to complete payment via MTN or Vodafone Cash
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTopUp(false)}
                className="flex-1 py-3 px-6 border-2 border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTopUp}
                disabled={processing || !topUpAmount || parseFloat(topUpAmount) <= 0}
                className="flex-1 py-3 px-6 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Processing...' : 'Top Up'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-6">Withdraw Funds</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (GHS)
              </label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount"
                max={wallet?.balance || 0}
                className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
              />
              <p className="text-sm text-gray-600 mt-2">
                Available: {formatCurrency(wallet?.balance || 0)}
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-xl mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Withdrawals are processed within 24 hours. A small fee may apply.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdraw(false)}
                className="flex-1 py-3 px-6 border-2 border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={processing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > (wallet?.balance || 0)}
                className="flex-1 py-3 px-6 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Processing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}