import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Phone, 
  Mail, 
  Truck, 
  Wrench, 
  MapPin, 
  Calendar, 
  FileText, 
  Car, 
  Award
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PendingAgent } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';
import toast from '../../lib/toast';

export const AgentApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  
  const [application, setApplication] = useState<PendingAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  
  useEffect(() => {
    // Redirect if not admin
    if (userRole && userRole !== 'admin') {
      navigate('/dashboard');
      return;
    }
    
    // Only load if we have an ID and userRole is checked
    if (id && userRole === 'admin') {
      loadApplicationDetails();
    }
  }, [id, userRole, navigate]);
  
  const loadApplicationDetails = async () => {
    try {
      setLoading(true);
      
      if (!id) {
        toast.error('Application ID is required');
        navigate('/admin/agent-applications');
        return;
      }
      
      console.log('Loading application details for ID:', id);
      
      const { data, error } = await supabase
        .from('pending_agents')
        .select('*')
        .eq('id', id)
        .single();
      
      console.log('Application data:', data, 'Error:', error);
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (!data) {
        console.error('No application data found');
        toast.error('Application not found');
        setApplication(null);
        return;
      }
      
      setApplication(data as PendingAgent);
      console.log('Application loaded successfully');
    } catch (err: any) {
      console.error('Error loading application details:', err);
      toast.error(err.message || 'Failed to load application details');
      setApplication(null);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };
  
  const handleApprove = async () => {
    if (!application) return;
    
    if (actionLoading) return; // Prevent double-click
    
    setActionLoading(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      const adminId = userData.user?.id;
      
      if (!adminId) {
        toast.error('Admin ID not found. Please log in again.');
        setActionLoading(false);
        return;
      }
      
      console.log('Approving application via RPC v2:', id);
      
      const { data, error } = await supabase.rpc('approve_agent_application_v2', {
        application_id: id,
        admin_id: adminId,
        admin_notes: adminNotes || 'Approved'
      });
      
      console.log('Approval response:', { data, error });
      
      if (error) {
        console.error('Approval error:', error);
        toast.error(error.message || 'Failed to approve application');
        setActionLoading(false);
        return;
      }
      
      // Check the result from the function
      if (data && data.success === false) {
        console.error('Approval failed:', data.error);
        toast.error(data.error || 'Failed to approve application');
        setActionLoading(false);
        return;
      }
      
      toast.success('Application approved successfully! Agent account has been created.');
      
      // Refresh data
      await loadApplicationDetails();
      
    } catch (err: any) {
      console.error('Error approving application:', err);
      toast.error(err.message || 'Failed to approve application. Please check console for details.');
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleReject = async () => {
    if (!application) return;
    
    if (actionLoading) return; // Prevent double-click
    
    if (!adminNotes || adminNotes.trim() === '') {
      toast.warning('Please provide a reason for rejection in the notes');
      return;
    }
    
    setActionLoading(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      const adminId = userData.user?.id;
      
      if (!adminId) {
        toast.error('Admin ID not found. Please log in again.');
        setActionLoading(false);
        return;
      }
      
      console.log('Rejecting application via RPC v2:', id);
      
      const { data, error } = await supabase.rpc('reject_agent_application_v2', {
        application_id: id,
        admin_id: adminId,
        admin_notes: adminNotes
      });
      
      console.log('Rejection response:', { data, error });
      
      if (error) {
        console.error('Rejection error:', error);
        toast.error(error.message || 'Failed to reject application');
        setActionLoading(false);
        return;
      }
      
      // Check the result from the function
      if (data && data.success === false) {
        console.error('Rejection failed:', data.error);
        toast.error(data.error || 'Failed to reject application');
        setActionLoading(false);
        return;
      }
      
      toast.success('Application rejected successfully.');
      
      // Refresh data
      await loadApplicationDetails();
      
    } catch (err: any) {
      console.error('Error rejecting application:', err);
      toast.error(err.message || 'Failed to reject application. Please check console for details.');
    } finally {
      setActionLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }
  
  if (!application) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 text-center shadow-lg max-w-md">
          <XCircle className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Application Not Found</h2>
          <p className="text-gray-300 mb-6">We couldn't find the agent application you're looking for.</p>
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Agent Application Details</h1>
              <div className="text-gray-300 text-sm">Review and process agent application</div>
            </div>
          </div>
          <div className="flex gap-3">
            {application.status === 'pending' && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/30 rounded-xl text-emerald-400 font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={18} />
                  {actionLoading ? 'Processing...' : 'Approve Application'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading || !adminNotes}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-600/30 rounded-xl text-rose-400 font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle size={18} />
                  {actionLoading ? 'Processing...' : 'Reject Application'}
                </button>
              </>
            )}
          </div>
        </div>

        
        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Personal info */}
          <div className="bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Personal Information</h2>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                application.status === 'approved' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : application.status === 'rejected'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {application.status === 'approved' ? 'Approved' : application.status === 'rejected' ? 'Rejected' : 'Pending'}
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-xl">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-2xl">
                  {application.name.charAt(0)}
                </div>
                <div>
                  <div className="text-lg font-medium">{application.name}</div>
                  <div className="text-gray-300 text-sm">Applicant ID: {application.id.slice(0, 8)}...</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-700/20 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-400" />
                  <div>
                    <div className="text-sm text-gray-400">Email Address</div>
                    <div>{application.email}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-700/20 rounded-lg">
                  <Phone className="h-5 w-5 text-blue-400" />
                  <div>
                    <div className="text-sm text-gray-400">Phone Number</div>
                    <div>{application.phone || 'Not provided'}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-700/20 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-400" />
                  <div>
                    <div className="text-sm text-gray-400">Applied On</div>
                    <div>{formattedDate(application.created_at)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-700/20 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-400" />
                  <div>
                    <div className="text-sm text-gray-400">Location</div>
                    <div>{application.location || 'Not provided'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Middle column - Service details */}
          <div className="bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-6">Service Information</h2>
            
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-gray-700/30 rounded-xl">
                <div className={`w-12 h-12 rounded-xl ${
                  application.service_type === 'fuel_delivery' 
                    ? 'bg-blue-500/20' 
                    : application.service_type === 'mechanic'
                    ? 'bg-purple-500/20'
                    : 'bg-gradient-to-r from-blue-500/20 to-purple-500/20'
                } flex items-center justify-center`}>
                  {application.service_type === 'fuel_delivery' ? (
                    <Truck className="h-6 w-6 text-blue-400" />
                  ) : application.service_type === 'mechanic' ? (
                    <Wrench className="h-6 w-6 text-purple-400" />
                  ) : (
                    <div className="flex">
                      <Truck className="h-5 w-5 text-blue-400" />
                      <Wrench className="h-5 w-5 text-purple-400 ml-1" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-gray-400">Service Type</div>
                  <div className="font-medium">
                    {application.service_type === 'fuel_delivery' 
                      ? 'Fuel Delivery' 
                      : application.service_type === 'mechanic'
                      ? 'Mechanic Services'
                      : 'Fuel Delivery & Mechanic Services'}
                  </div>
                </div>
              </div>
              
              {(application.service_type === 'fuel_delivery' || application.service_type === 'both') && application.vehicle_info && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-300">Vehicle Information</h3>
                  
                  <div className="flex items-center gap-3 p-3 bg-gray-700/20 rounded-lg">
                    <Car className="h-5 w-5 text-blue-400" />
                    <div>
                      <div className="text-sm text-gray-400">Vehicle Details</div>
                      <div>
                        {application.vehicle_info.make || 'N/A'} {application.vehicle_info.model || ''} {application.vehicle_info.year || ''}
                      </div>
                    </div>
                  </div>
                  
                  {application.vehicle_info.plateNumber && (
                    <div className="flex items-center gap-3 p-3 bg-gray-700/20 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-400" />
                      <div>
                        <div className="text-sm text-gray-400">License Plate</div>
                        <div>{application.vehicle_info.plateNumber}</div>
                      </div>
                    </div>
                  )}
                  
                  {application.license_number && (
                    <div className="flex items-center gap-3 p-3 bg-gray-700/20 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-400" />
                      <div>
                        <div className="text-sm text-gray-400">License Number</div>
                        <div>{application.license_number}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {application.experience && (
                <div className="flex items-center gap-3 p-3 bg-gray-700/20 rounded-lg">
                  <Award className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-400">Experience</div>
                    <div className="break-words">{application.experience}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Right column - Admin actions */}
          <div className="bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-6">Admin Review</h2>
            
            <div className="space-y-6">
              {application.status !== 'pending' && (
                <div>
                  <h3 className="font-medium text-gray-300 mb-2">Review Information</h3>
                  
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-700/20 rounded-lg">
                      <div className="text-sm text-gray-400">Review Status</div>
                      <div>{formattedDate(application.updated_at)}</div>
                    </div>
                    
                    <div className="p-3 bg-gray-700/20 rounded-lg">
                      <div className="text-sm text-gray-400">Admin Notes</div>
                      <div className="whitespace-pre-wrap">{application.admin_notes || 'No notes provided'}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {application.status === 'pending' && (
                <div>
                  <h3 className="font-medium text-gray-300 mb-2">Action Required</h3>
                  
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-4">
                    <p className="text-amber-400 text-sm">
                      Please review the application details and approve or reject based on the provided information.
                      {application.service_type === 'fuel_delivery' && ' Verify vehicle and license information carefully.'}
                    </p>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-300 mb-2 text-sm font-medium">Admin Notes (required for rejection)</label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full p-3 bg-gray-700/30 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="Enter notes about this application..."
                      rows={5}
                    ></textarea>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="py-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/30 rounded-xl text-emerald-400 font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? 'Processing...' : 'Approve'}
                    </button>
                    
                    <button
                      onClick={handleReject}
                      disabled={actionLoading || !adminNotes}
                      className="py-3 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-600/30 rounded-xl text-rose-400 font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? 'Processing...' : 'Reject'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
