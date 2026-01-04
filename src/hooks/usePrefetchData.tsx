import { useEffect } from 'react'
import { supabase, getUserVehicles, getUserWallet } from '../lib/supabase'

export const usePrefetchData = (userId: string | undefined) => {
  useEffect(() => {
    if (!userId) return

    const prefetchAllData = async () => {
      try {
        // Vehicles
        const vehiclesData = await getUserVehicles(userId).catch(() => [])
        
        // Wallet
        const walletData = await getUserWallet(userId).catch(() => null)
        
        // Transactions
        const transactionsResult = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)
        const transactionsData = transactionsResult.data || []
        
        // Orders
        const ordersResult = await supabase
          .from('orders')
          .select(`
            *,
            vehicles(make, model, plate_number),
            agents(users(name, phone)),
            stations(name, image_url)
          `)
          .eq('customer_id', userId)
          .order('created_at', { ascending: false })
        const ordersData = ordersResult.data || []
        
        // Stations
        const stationsResult = await supabase
          .from('stations')
          .select(`
            *,
            users!stations_user_id_fkey(name)
          `)
          .eq('is_active', true)
          .eq('is_verified', true)
          .limit(4)
        const stationsData = stationsResult.data || []
        
        // Mechanics
        const mechanicsResult = await supabase
          .from('agents')
          .select(`
            *,
            users!agents_user_id_fkey(name)
          `)
          .in('service_type', ['mechanic', 'both'])
          .eq('is_available', true)
          .eq('is_verified', true)
          .limit(4)
        const mechanicsData = mechanicsResult.data || []
        
        // Profile
        const profileResult = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()
        const profileData = profileResult.data
        
        // Prefetch all stations for RequestFuel page
        const allStationsResult = await supabase
          .from('stations')
          .select('*')
          .eq('is_verified', true)
          .eq('is_active', true)
          .order('name')
        const allStationsData = allStationsResult.data || []

        // Cache all data in localStorage
        if (vehiclesData.length > 0) {
          localStorage.setItem('vehicles_data', JSON.stringify(vehiclesData))
          localStorage.setItem('requestfuel_vehicles', JSON.stringify(vehiclesData))
          localStorage.setItem('requestmechanic_vehicles', JSON.stringify(vehiclesData))
        }

        if (walletData) {
          localStorage.setItem('wallet_data', JSON.stringify(walletData))
        }

        if (transactionsData.length > 0) {
          localStorage.setItem('transactions_data', JSON.stringify(transactionsData))
        }

        if (ordersData.length > 0) {
          localStorage.setItem('orders_data', JSON.stringify(ordersData))
        }

        if (stationsData.length > 0) {
          localStorage.setItem('dashboard_stations', JSON.stringify(stationsData))
        }
        
        if (allStationsData.length > 0) {
          localStorage.setItem('requestfuel_stations', JSON.stringify(allStationsData))
        }

        if (mechanicsData.length > 0) {
          localStorage.setItem('dashboard_mechanics', JSON.stringify(mechanicsData))
        }

        if (profileData) {
          const profileCache = {
            name: profileData.name || '',
            email: profileData.email || '',
            phone: profileData.phone || '',
            avatar_url: profileData.avatar_url || '',
            created_at: profileData.created_at
          }
          localStorage.setItem('profile_data', JSON.stringify(profileCache))
        }

        console.log('✅ All page data prefetched and cached')
      } catch (error) {
        console.error('Error prefetching data:', error)
      }
    }

    // Start prefetching after a short delay to not block initial render
    const timeoutId = setTimeout(() => {
      prefetchAllData()
    }, 1000)

    // Set up Supabase Realtime subscriptions for instant updates
    const ordersChannel = supabase
      .channel('customer-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `customer_id=eq.${userId}`
      }, () => {
        prefetchAllData()
      })
      .subscribe()

    const vehiclesChannel = supabase
      .channel('customer-vehicles')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vehicles',
        filter: `user_id=eq.${userId}`
      }, () => {
        prefetchAllData()
      })
      .subscribe()

    const transactionsChannel = supabase
      .channel('customer-transactions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${userId}`
      }, () => {
        prefetchAllData()
      })
      .subscribe()

    const walletsChannel = supabase
      .channel('customer-wallets')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wallets',
        filter: `user_id=eq.${userId}`
      }, () => {
        prefetchAllData()
      })
      .subscribe()

    const stationsChannel = supabase
      .channel('customer-stations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stations'
      }, () => {
        prefetchAllData()
      })
      .subscribe()

    const agentsChannel = supabase
      .channel('customer-agents')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agents'
      }, () => {
        prefetchAllData()
      })
      .subscribe()

    const usersChannel = supabase
      .channel('customer-profile')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`
      }, () => {
        prefetchAllData()
      })
      .subscribe()

    return () => {
      clearTimeout(timeoutId)
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(vehiclesChannel)
      supabase.removeChannel(transactionsChannel)
      supabase.removeChannel(walletsChannel)
      supabase.removeChannel(stationsChannel)
      supabase.removeChannel(agentsChannel)
      supabase.removeChannel(usersChannel)
    }
  }, [userId])
}
