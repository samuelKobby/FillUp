import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { ArrowLeft, MapPin, Clock, CheckCircle, XCircle, Clock as ClockIcon, Loader2 } from 'lucide-react';

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
  };
  vehicles?: {
    make: string;
    model: string;
    plate_number: string;
    fuel_type: string;
  };
}

export const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            stations (name, address, phone),
            vehicles (make, model, plate_number, fuel_type)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Order not found');

        setOrder(data as OrderDetails);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();

    // Set up Realtime subscription for instant order updates
    if (!id) return;
    
    const orderChannel = supabase
      .channel(`order-details-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${id}`
      }, () => {
        fetchOrderDetails();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(orderChannel);
    };
  }, [id]);

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const statusText = {
      pending: 'Pending Station Confirmation',
      accepted: 'Confirmed - Finding Driver',
      in_progress: 'Driver En Route',
      completed: 'Delivered',
      cancelled: 'Cancelled',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClasses[status as keyof typeof statusClasses]}`}>
        {statusText[status as keyof typeof statusText]}
      </span>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Order</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">The order you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button onClick={() => navigate('/history')} className="w-full">
              View Order History
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 mr-2"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Order Details</h1>
          <div className="ml-auto">
            {getStatusBadge(order.status)}
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Order Status */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 rounded-full mr-3">
                  {getStatusIcon(order.status)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {order.service_type === 'fuel_delivery' ? 'Fuel Delivery' : 'Mechanic Service'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Order #{order.id.split('-')[0].toUpperCase()}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                {new Date(order.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Order Details */}
          <div className="p-6 space-y-6">
            {order.service_type === 'fuel_delivery' && order.vehicles && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">VEHICLE</h4>
                <p className="font-medium">
                  {order.vehicles.make} {order.vehicles.model}
                </p>
                <p className="text-sm text-gray-500">
                  {order.vehicles.plate_number} • {order.vehicles.fuel_type}
                </p>
                {order.fuel_quantity && (
                  <p className="text-sm text-gray-500 mt-1">
                    {order.fuel_quantity}L of {order.fuel_type}
                  </p>
                )}
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">DELIVERY ADDRESS</h4>
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-gray-900">{order.delivery_address}</p>
              </div>
            </div>

            {order.scheduled_time && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">SCHEDULED TIME</h4>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-2" />
                  <p className="text-gray-900">
                    {new Date(order.scheduled_time).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )}

            {order.stations && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">STATION</h4>
                <p className="font-medium">{order.stations.name}</p>
                <p className="text-sm text-gray-500">{order.stations.address}</p>
                <a 
                  href={`tel:${order.stations.phone}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm mt-1"
                >
                  {order.stations.phone}
                </a>
              </div>
            )}

            {order.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">NOTES</h4>
                <p className="text-gray-900">{order.notes}</p>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="border-t border-gray-100 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-500 mb-3">PRICE BREAKDOWN</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>₵{(order.total_amount - order.platform_fee - order.agent_fee).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee</span>
                  <span>₵{order.agent_fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Fee</span>
                  <span>₵{order.platform_fee.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span className="text-blue-600">₵{order.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
            {order.status !== 'completed' && order.status !== 'cancelled' ? (
              <Button onClick={() => navigate(`/track-order/${order.id}`)}>
                Track Order
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate('/history')}>
                View All Orders
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
