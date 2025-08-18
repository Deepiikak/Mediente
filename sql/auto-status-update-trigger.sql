-- =====================================================
-- Automatic Call Sheet Status Update System
-- =====================================================

-- Function to automatically update call sheet statuses
CREATE OR REPLACE FUNCTION update_call_sheet_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if the date or time has changed
    IF (OLD.date IS DISTINCT FROM NEW.date) OR (OLD.time IS DISTINCT FROM NEW.time) THEN
        -- Calculate the correct status based on current date/time
        IF NEW.date < CURRENT_DATE THEN
            NEW.status = 'expired';
        ELSIF NEW.date = CURRENT_DATE THEN
            IF NEW.time < CURRENT_TIME THEN
                NEW.status = 'expired';
            ELSE
                -- Only set to active if it was upcoming (don't override manual statuses)
                IF OLD.status = 'upcoming' THEN
                    NEW.status = 'active';
                END IF;
            END IF;
        ELSE
            -- Future date - set to upcoming if it was active/expired
            IF OLD.status IN ('active', 'expired') THEN
                NEW.status = 'upcoming';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires on UPDATE of date/time columns
DROP TRIGGER IF EXISTS trigger_update_call_sheet_status ON public.call_sheets;
CREATE TRIGGER trigger_update_call_sheet_status
    BEFORE UPDATE OF date, time ON public.call_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_call_sheet_status();

-- Function to batch update expired call sheets (to be called periodically)
CREATE OR REPLACE FUNCTION batch_update_expired_call_sheets()
RETURNS TABLE(updated_count INTEGER) AS $$
DECLARE
    update_count INTEGER;
BEGIN
    -- Update call sheets that have passed their date/time
    UPDATE public.call_sheets 
    SET status = 'expired', updated_at = NOW()
    WHERE (
        date < CURRENT_DATE 
        OR (date = CURRENT_DATE AND time < CURRENT_TIME)
    )
    AND status IN ('upcoming', 'active');
    
    GET DIAGNOSTICS update_count = ROW_COUNT;
    
    -- Update today's upcoming call sheets to active if their time hasn't passed
    UPDATE public.call_sheets 
    SET status = 'active', updated_at = NOW()
    WHERE date = CURRENT_DATE 
    AND time >= CURRENT_TIME
    AND status = 'upcoming';
    
    GET DIAGNOSTICS update_count = update_count + ROW_COUNT;
    
    RETURN QUERY SELECT update_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get call sheets that should change status soon (next 24 hours)
CREATE OR REPLACE FUNCTION get_upcoming_status_changes()
RETURNS TABLE(
    id UUID,
    project_name TEXT,
    current_status TEXT,
    new_status TEXT,
    date DATE,
    time TIME,
    minutes_until_change INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.project_name,
        cs.status as current_status,
        CASE 
            WHEN cs.date < CURRENT_DATE OR (cs.date = CURRENT_DATE AND cs.time < CURRENT_TIME) THEN 'expired'
            WHEN cs.date = CURRENT_DATE AND cs.time >= CURRENT_TIME THEN 'active'
            ELSE 'upcoming'
        END as new_status,
        cs.date,
        cs.time,
        EXTRACT(EPOCH FROM (
            TIMESTAMP(cs.date, cs.time) - NOW()
        ))::INTEGER / 60 as minutes_until_change
    FROM public.call_sheets cs
    WHERE 
        -- Call sheets in the next 24 hours
        TIMESTAMP(cs.date, cs.time) BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
        AND cs.status != 'archived'
    ORDER BY TIMESTAMP(cs.date, cs.time);
END;
$$ LANGUAGE plpgsql;

-- Create a view for real-time status (computed based on current time)
CREATE OR REPLACE VIEW public.call_sheets_with_realtime_status AS
SELECT 
    cs.*,
    CASE 
        WHEN cs.date < CURRENT_DATE THEN 'expired'
        WHEN cs.date = CURRENT_DATE AND cs.time < CURRENT_TIME THEN 'expired'
        WHEN cs.date = CURRENT_DATE AND cs.time >= CURRENT_TIME THEN 'active'
        WHEN cs.date > CURRENT_DATE THEN 'upcoming'
        ELSE cs.status
    END as realtime_status,
    -- Time until status change (in minutes)
    CASE 
        WHEN cs.date = CURRENT_DATE AND cs.time >= CURRENT_TIME THEN
            EXTRACT(EPOCH FROM (TIMESTAMP(cs.date, cs.time) - NOW()))::INTEGER / 60
        WHEN cs.date > CURRENT_DATE THEN
            EXTRACT(EPOCH FROM (TIMESTAMP(cs.date, cs.time) - NOW()))::INTEGER / 60
        ELSE NULL
    END as minutes_until_change
FROM public.call_sheets cs;

-- Grant permissions on the new functions and view
GRANT EXECUTE ON FUNCTION batch_update_expired_call_sheets() TO authenticated;
GRANT EXECUTE ON FUNCTION get_upcoming_status_changes() TO authenticated;
GRANT SELECT ON public.call_sheets_with_realtime_status TO authenticated;
GRANT SELECT ON public.call_sheets_with_realtime_status TO anon;

-- Example of how to set up a cron job (requires pg_cron extension)
-- This would run every 5 minutes to update expired statuses
/*
SELECT cron.schedule(
    'update-expired-call-sheets',
    '*/5 * * * *',  -- Every 5 minutes
    'SELECT batch_update_expired_call_sheets();'
);
*/

-- Example usage:
-- SELECT * FROM batch_update_expired_call_sheets(); -- Returns number of updated records
-- SELECT * FROM get_upcoming_status_changes(); -- Shows what will change soon
-- SELECT * FROM call_sheets_with_realtime_status WHERE realtime_status != status; -- Shows status mismatches

