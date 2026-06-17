-- 🚀 ALTER OTP TABLE TO SUPPORT EMAIL CONTACTS
ALTER TABLE otp_table ALTER COLUMN mobile TYPE VARCHAR(100);

-- 🚀 CREATE NOTIFICATION SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    citizen_contact VARCHAR(100) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (complaint_id, citizen_contact, channel)
);

-- 🚀 CREATE NOTIFICATION LOG TABLE
CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
    message TEXT NOT NULL,
    delivery_status VARCHAR(20) NOT NULL CHECK (delivery_status IN ('sent', 'delivered', 'failed', 'read', 'queued')),
    sent_at TIMESTAMP DEFAULT NOW()
);

-- 🚀 ADD SATISFACTION RATING COLUMNS TO COMPLAINTS TABLE
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS satisfaction_response INT CHECK (satisfaction_response IN (1, 2));
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS satisfaction_responded_at TIMESTAMP;
