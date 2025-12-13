-- Add an SQL function to get application statistics for the admin dashboard

CREATE OR REPLACE FUNCTION get_agent_application_stats()
RETURNS json AS $$
DECLARE
    total_count int;
    pending_count int;
    approved_count int;
    rejected_count int;
    today_count int;
    weekly_count int;
    monthly_count int;
    today_date date := current_date;
    weekly_date date := current_date - interval '7 days';
    monthly_date date := current_date - interval '30 days';
BEGIN
    -- Get counts by status
    SELECT COUNT(*) INTO total_count FROM pending_agents;
    SELECT COUNT(*) INTO pending_count FROM pending_agents WHERE status = 'pending';
    SELECT COUNT(*) INTO approved_count FROM pending_agents WHERE status = 'approved';
    SELECT COUNT(*) INTO rejected_count FROM pending_agents WHERE status = 'rejected';
    
    -- Get counts by time period
    SELECT COUNT(*) INTO today_count FROM pending_agents WHERE DATE(created_at) = today_date;
    SELECT COUNT(*) INTO weekly_count FROM pending_agents WHERE created_at >= weekly_date;
    SELECT COUNT(*) INTO monthly_count FROM pending_agents WHERE created_at >= monthly_date;
    
    -- Return as JSON
    RETURN json_build_object(
        'total', total_count,
        'pending', pending_count,
        'approved', approved_count,
        'rejected', rejected_count,
        'today', today_count,
        'weekly', weekly_count,
        'monthly', monthly_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get recent agent applications with full details
CREATE OR REPLACE FUNCTION get_recent_agent_applications(
    status_filter text DEFAULT NULL,
    limit_count int DEFAULT 10
)
RETURNS SETOF pending_agents AS $$
BEGIN
    IF status_filter IS NULL THEN
        RETURN QUERY
        SELECT * FROM pending_agents
        ORDER BY created_at DESC
        LIMIT limit_count;
    ELSE
        RETURN QUERY
        SELECT * FROM pending_agents
        WHERE status = status_filter
        ORDER BY created_at DESC
        LIMIT limit_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to search agent applications
CREATE OR REPLACE FUNCTION search_agent_applications(
    search_query text,
    status_filter text DEFAULT NULL
)
RETURNS SETOF pending_agents AS $$
BEGIN
    IF status_filter IS NULL THEN
        RETURN QUERY
        SELECT * FROM pending_agents
        WHERE 
            name ILIKE '%' || search_query || '%' OR
            email ILIKE '%' || search_query || '%' OR
            phone ILIKE '%' || search_query || '%' OR
            location ILIKE '%' || search_query || '%'
        ORDER BY created_at DESC;
    ELSE
        RETURN QUERY
        SELECT * FROM pending_agents
        WHERE 
            (name ILIKE '%' || search_query || '%' OR
            email ILIKE '%' || search_query || '%' OR
            phone ILIKE '%' || search_query || '%' OR
            location ILIKE '%' || search_query || '%')
            AND status = status_filter
        ORDER BY created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
