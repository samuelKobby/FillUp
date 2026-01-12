import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Clock as ClockIcon, 
  Loader2,
  Phone,
  Calendar,
  Package,
  DollarSign,
  Truck,
  Car
} from 'lucide-react';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { useDataRefreshOnVisibility } from '../hooks/useDataRefreshOnVisibility';
import { useCachedData } from '../hooks/useCachedData';

interface OrderDetails {
  id: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  service_type: 'fuel_delivery' | 'mechanic';
  fuel_type?: string;
  fuel_quantity?: number;
  delivery_address: string;
  total_amount: number;
  platform_fee: number;
  agent_fee: number;
  notes?: string;
  scheduled_time?: string;
  stations?: {
    name: string;
    address: string;
    phone: string;
    image_url?: string;
  };
  vehicles?: {
    make: string;
    model: string;
    plate_number: string;
    fuel_type: string;
    image_url?: string;
  };
}

export const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchOrderDetails = useCallback(async (): Promise<OrderDetails> => {
    if (!id) throw new Error('No order ID');
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        stations (name, address, phone, image_url),
        vehicles (make, model, plate_number, fuel_type, image_url)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Order not found');

    return data as OrderDetails;
  }, [id]);

  const { data: order, loading, error } = useCachedData<OrderDetails>({
    cacheKey: `order_details_${id}`,
    userId: user?.id,
    fetchFn: fetchOrderDetails,
    enabled: !!id
  });

  // Set up Realtime subscription with auto-reconnection
  useRealtimeSubscription({
    channelName: `order-details-${id}`,
    table: 'orders',
    filter: `id=eq.${id}`,
    onUpdate: fetchOrderDetails,
    enabled: !!id
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        bg: 'bg-yellow-50', 
        text: 'text-yellow-700', 
        border: 'border-yellow-200',
        label: 'Pending Station Confirmation',
        icon: ClockIcon
      },
      accepted: { 
        bg: 'bg-blue-50', 
        text: 'text-blue-700', 
        border: 'border-blue-200',
        label: 'Confirmed - Finding Driver',
        icon: Loader2
      },
      in_progress: { 
        bg: 'bg-purple-50', 
        text: 'text-purple-700', 
        border: 'border-purple-200',
        label: 'Driver En Route',
        icon: Truck
      },
      completed: { 
        bg: 'bg-green-50', 
        text: 'text-green-700', 
        border: 'border-green-200',
        label: 'Delivered',
        icon: CheckCircle
      },
      cancelled: { 
        bg: 'bg-red-50', 
        text: 'text-red-700', 
        border: 'border-red-200',
        label: 'Cancelled',
        icon: XCircle
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) {
      return {
        badge: (
          <span className="bg-gray-50 text-gray-700 border-2 border-gray-200 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            Unknown Status
          </span>
        ),
        config: statusConfig.pending
      };
    }

    const StatusIcon = config.icon;

    return {
      badge: (
        <span className={`${config.bg} ${config.text} border-2 ${config.border} px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2`}>
          <StatusIcon className={`h-4 w-4 ${status === 'accepted' ? 'animate-spin' : ''}`} />
          {config.label}
        </span>
      ),
      config
    };
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="bg-white rounded-3xl p-8 shadow-xl">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Order</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate(-1)} variant="outline" className="w-full rounded-2xl py-3">
              Go Back
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="bg-white rounded-3xl p-8 shadow-xl">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">The order you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button onClick={() => navigate('/history')} className="w-full rounded-2xl py-3">
              View Order History
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const statusInfo = getStatusBadge(order.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section with Image */}
      <div className="relative h-64 bg-gray-100 overflow-hidden">
        {/* Vehicle/Station Image */}
        {(order.vehicles?.image_url || order.stations?.image_url) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full h-full"
            >
              <img 
                src={order.vehicles?.image_url || order.stations?.image_url} 
                alt="Order"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        )}

        {/* Transparent Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-50 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:bg-white/30 transition-all hover:scale-110"
        >
          <ArrowLeft className="h-5 w-5 text-black" />
        </motion.button>

        {/* Floating Status Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 right-4 z-50"
        >
          {statusInfo.badge}
        </motion.div>
      </div>

      {/* Content Card */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-t-[3rem] -mt-12 relative z-20 px-6 pt-8 pb-24 shadow-2xl min-h-[calc(100vh-16rem)]"
      >
        {/* Order Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            {order.service_type === 'fuel_delivery' ? (
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                <Car className="h-6 w-6 text-orange-600" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {order.service_type === 'fuel_delivery' ? 'Fuel Delivery' : 'Mechanic Service'}
              </h1>
              <p className="text-sm text-gray-500">
                Order #{order.id.split('-')[0].toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text">
                ₵{order.total_amount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Vehicle/Service Details Card */}
        {order.service_type === 'fuel_delivery' && order.vehicles && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 mb-4 border border-blue-100"
          >
            <div className="flex items-center gap-4">
              {order.vehicles.image_url && (
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white shadow-sm flex-shrink-0">
                  <img 
                    src={order.vehicles.image_url} 
                    alt={`${order.vehicles.make} ${order.vehicles.model}`}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg">
                  {order.vehicles.make} {order.vehicles.model}
                </h3>
                <p className="text-sm text-gray-600">{order.vehicles.plate_number}</p>
                {order.fuel_quantity && (
                  <div className="mt-2 inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                    <Package className="h-4 w-4" />
                    {order.fuel_quantity}L {order.fuel_type?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Station Details Card */}
        {order.stations && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 mb-4 border border-green-100"
          >
            <div className="flex items-start gap-4">
              {order.stations.image_url && (
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white shadow-sm flex-shrink-0">
                  <img 
                    src={order.stations.image_url} 
                    alt={order.stations.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{order.stations.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{order.stations.address}</p>
                <a 
                  href={`tel:${order.stations.phone}`}
                  className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium mt-2"
                >
                  <Phone className="h-4 w-4" />
                  {order.stations.phone}
                </a>
              </div>
            </div>
          </motion.div>
        )}

        {/* Delivery Address Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 mb-4 border border-purple-100"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">Delivery Address</h4>
              <p className="text-gray-700">{order.delivery_address}</p>
            </div>
          </div>
        </motion.div>

        {/* Scheduled Time */}
        {order.scheduled_time && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 mb-4 border border-orange-100"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Scheduled Time</h4>
                <p className="text-gray-700">
                  {new Date(order.scheduled_time).toLocaleString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Notes */}
        {order.notes && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-50 rounded-2xl p-5 mb-4"
          >
            <h4 className="font-semibold text-gray-900 mb-2">Additional Notes</h4>
            <p className="text-gray-700">{order.notes}</p>
          </motion.div>
        )}

        {/* Price Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-5 mb-6 border border-gray-200"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-gray-600" />
            </div>
            <h4 className="font-bold text-gray-900">Price Breakdown</h4>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span className="font-medium">₵{(order.total_amount - order.platform_fee - order.agent_fee).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Service Fee</span>
              <span className="font-medium">₵{order.agent_fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Platform Fee</span>
              <span className="font-medium">₵{order.platform_fee.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-gray-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900 text-lg">Total</span>
                <span className="font-bold text-2xl text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text">
                  ₵{order.total_amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Order Date */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-gray-500 mb-6"
        >
          Ordered on {new Date(order.created_at).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex gap-3"
        >
          {order.status !== 'completed' && order.status !== 'cancelled' ? (
            <Button 
              onClick={() => navigate(`/track-order/${order.id}`)}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl py-4 font-semibold shadow-lg"
            >
              Track Order
            </Button>
          ) : (
            <Button 
              onClick={() => navigate('/history')}
              className="flex-1 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white rounded-2xl py-4 font-semibold"
            >
              View All Orders
            </Button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};
