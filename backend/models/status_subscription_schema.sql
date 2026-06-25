-- 🚀 ALTER OTP TABLE TO SUPPORT EMAIL CONTACTS
ALTER TABLE otp_table ALTER COLUMN mobile TYPE VARCHAR(100);

-- 🚀 CREATE NOTIFICATION SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
    service_request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
    citizen_contact VARCHAR(100) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- We use DO block to ensure the table supports both and drops old constraints safely
DO $$ 
DECLARE 
    cname text;
BEGIN
    ALTER TABLE notification_subscriptions ADD COLUMN IF NOT EXISTS service_request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE;
    ALTER TABLE notification_subscriptions ALTER COLUMN complaint_id DROP NOT NULL;
    
    -- Drop all unique constraints to replace with partial indexes
    FOR cname IN (SELECT conname FROM pg_constraint WHERE conrelid = 'notification_subscriptions'::regclass AND contype = 'u')
    LOOP
        EXECUTE 'ALTER TABLE notification_subscriptions DROP CONSTRAINT IF EXISTS ' || cname;
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_sub_cmp ON notification_subscriptions (complaint_id, citizen_contact, channel) WHERE complaint_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_sub_srq ON notification_subscriptions (service_request_id, citizen_contact, channel) WHERE service_request_id IS NOT NULL;

-- 🚀 CREATE NOTIFICATION LOG TABLE
CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
    service_request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
    message TEXT NOT NULL,
    delivery_status VARCHAR(20) NOT NULL CHECK (delivery_status IN ('sent', 'delivered', 'failed', 'read', 'queued')),
    sent_at TIMESTAMP DEFAULT NOW()
);

DO $$ 
BEGIN
    ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS service_request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE;
    ALTER TABLE notification_log ALTER COLUMN complaint_id DROP NOT NULL;
END $$;

-- 🚀 ADD SATISFACTION RATING COLUMNS TO COMPLAINTS TABLE
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS satisfaction_response INT CHECK (satisfaction_response IN (1, 2));
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS satisfaction_responded_at TIMESTAMP;
