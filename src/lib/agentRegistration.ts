import { supabase } from '../lib/supabase';

/**
 * Register a new agent with the application
 * This function handles the complete agent registration process
 * including creating the auth account and pending agent application
 * 
 * @param {Object} agentData - The agent registration data
 * @param {string} agentData.email - Email address
 * @param {string} agentData.password - Password
 * @param {string} agentData.name - Full name
 * @param {string} agentData.phone - Phone number
 * @param {('fuel_delivery'|'mechanic'|'both')} agentData.serviceType - Service type offered by the agent
 * @param {string} [agentData.licenseNumber] - Driver's license number (required for fuel delivery)
 * @param {Object} [agentData.vehicleInfo] - Vehicle information (required for fuel delivery)
 * @param {string} [agentData.experience] - Years of experience
 * @param {string} [agentData.location] - Current location
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const registerNewAgent = async (agentData) => {
    try {
        const {
            email,
            password,
            name,
            phone,
            serviceType,
            licenseNumber,
            vehicleInfo,
            experience,
            location
        } = agentData;

        // 1. Sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    phone,
                    service_type: serviceType,
                    role: 'agent',
                    intent: 'agent_registration',
                    license_number: licenseNumber || null,
                    vehicle_info: vehicleInfo || null,
                    experience: experience || null,
                    location: location || null
                }
            }
        });

        if (authError) throw authError;

        // 2. Verify that the registration triggered a pending_agents entry
        // Wait a moment for the trigger to execute
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data: pendingAgent, error: pendingAgentError } = await supabase
            .from('pending_agents')
            .select('*')
            .eq('auth_id', authData.user.id)
            .single();

        if (pendingAgentError) {
            // If no entry was created by the trigger, use the RPC function as a fallback
            const { data: rpcResult, error: rpcError } = await supabase.rpc('register_new_agent', {
                email,
                password,
                name,
                phone,
                service_type: serviceType,
                license_number: licenseNumber || null,
                vehicle_info: vehicleInfo || null,
                experience: experience || null,
                location: location || null
            });

            if (rpcError) throw rpcError;
        }

        // 3. Return success
        return {
            success: true,
            data: {
                message: 'Agent registration successful. Your application is pending review.',
                user: authData.user
            }
        };
    } catch (error) {
        console.error('Error registering agent:', error);
        return {
            success: false,
            error: {
                message: 'Failed to register agent',
                details: error.message
            }
        };
    }
};

/**
 * Check the status of an agent application
 * 
 * @param {string} userId - The user ID to check application status for
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
export const checkAgentApplicationStatus = async (userId) => {
    try {
        const { data: statusData, error } = await supabase.rpc('get_agent_application_status', {
            auth_user_id: userId
        });

        if (error) throw error;

        return {
            success: true,
            data: statusData
        };
    } catch (error) {
        console.error('Error checking application status:', error);
        return {
            success: false,
            error: {
                message: 'Failed to check application status',
                details: error.message
            }
        };
    }
};
