-- ═══════════════════════════════════════════════════════════════
-- AAZHI Sovereign Security Hardening — Tamper-Evident Audit Chain
-- PostgreSQL schema for immutable, cryptographically chained logs
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action_type') THEN
        CREATE TYPE audit_action_type AS ENUM (
            'LOGIN',
            'LOGOUT',
            'STATUS_CHANGE',
            'DATA_EDIT',
            'CREATE',
            'DELETE',
            'EXPORT',
            'APPROVAL',
            'REJECTION',
            'SECURITY_EVENT'
        );
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS audit_chain_entries (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain_sequence          BIGSERIAL UNIQUE,
    timestamp               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id                UUID,
    actor_role              VARCHAR(32) NOT NULL,
    resource_type           VARCHAR(64) NOT NULL,
    resource_id             UUID NOT NULL,
    action                  audit_action_type NOT NULL,
    ip_fingerprint          VARCHAR(128) NOT NULL,
    user_agent_fingerprint  VARCHAR(128),
    request_id              UUID,
    previous_entry_id       UUID REFERENCES audit_chain_entries(id),
    previous_entry_hmac     TEXT,
    previous_state_hash     CHAR(64) NOT NULL,
    current_state_hash      CHAR(64) NOT NULL,
    entry_payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
    entry_hmac              TEXT NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_audit_hashes_hex
        CHECK (
            previous_state_hash ~ '^[a-f0-9]{64}$'
            AND current_state_hash ~ '^[a-f0-9]{64}$'
        ),
    CONSTRAINT chk_audit_fingerprint_length
        CHECK (char_length(ip_fingerprint) >= 16)
);

CREATE INDEX IF NOT EXISTS idx_audit_chain_timestamp
    ON audit_chain_entries (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_chain_actor
    ON audit_chain_entries (actor_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_chain_resource
    ON audit_chain_entries (resource_type, resource_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_chain_action
    ON audit_chain_entries (action, timestamp DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_chain_previous_entry
    ON audit_chain_entries (previous_entry_id)
    WHERE previous_entry_id IS NOT NULL;

COMMENT ON TABLE audit_chain_entries IS
'Government-grade immutable audit trail. Each row stores the HMAC of the previous entry to form a tamper-evident chain.';

COMMENT ON COLUMN audit_chain_entries.previous_state_hash IS
'SHA-256 hash of the resource state before mutation. Use 64-char lowercase hex encoding.';
COMMENT ON COLUMN audit_chain_entries.current_state_hash IS
'SHA-256 hash of the resource state after mutation. Use 64-char lowercase hex encoding.';
COMMENT ON COLUMN audit_chain_entries.previous_entry_hmac IS
'HMAC copied from the immediately previous audit row to bind the chain.';
COMMENT ON COLUMN audit_chain_entries.entry_hmac IS
'HMAC over the current row canonical payload plus previous_entry_hmac.';

CREATE OR REPLACE FUNCTION compute_audit_entry_hmac(
    p_secret TEXT,
    p_previous_entry_hmac TEXT,
    p_timestamp TIMESTAMPTZ,
    p_actor_id UUID,
    p_resource_id UUID,
    p_action audit_action_type,
    p_ip_fingerprint TEXT,
    p_previous_state_hash TEXT,
    p_current_state_hash TEXT,
    p_entry_payload JSONB
)
RETURNS TEXT
LANGUAGE SQL
AS $$
    SELECT encode(
        hmac(
            concat_ws(
                '|',
                COALESCE(p_previous_entry_hmac, 'GENESIS'),
                p_timestamp::text,
                COALESCE(p_actor_id::text, 'SYSTEM'),
                p_resource_id::text,
                p_action::text,
                p_ip_fingerprint,
                p_previous_state_hash,
                p_current_state_hash,
                COALESCE(p_entry_payload::text, '{}'::jsonb::text)
            )::bytea,
            p_secret::bytea,
            'sha256'
        ),
        'hex'
    );
$$;

CREATE OR REPLACE FUNCTION append_audit_chain_entry(
    p_secret TEXT,
    p_actor_id UUID,
    p_actor_role VARCHAR,
    p_resource_type VARCHAR,
    p_resource_id UUID,
    p_action audit_action_type,
    p_ip_fingerprint TEXT,
    p_user_agent_fingerprint TEXT,
    p_request_id UUID,
    p_previous_state_hash CHAR(64),
    p_current_state_hash CHAR(64),
    p_entry_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS audit_chain_entries
LANGUAGE plpgsql
AS $$
DECLARE
    v_previous audit_chain_entries;
    v_timestamp TIMESTAMPTZ := NOW();
    v_new_entry audit_chain_entries;
BEGIN
    SELECT *
    INTO v_previous
    FROM audit_chain_entries
    ORDER BY chain_sequence DESC
    LIMIT 1
    FOR UPDATE;

    INSERT INTO audit_chain_entries (
        timestamp,
        actor_id,
        actor_role,
        resource_type,
        resource_id,
        action,
        ip_fingerprint,
        user_agent_fingerprint,
        request_id,
        previous_entry_id,
        previous_entry_hmac,
        previous_state_hash,
        current_state_hash,
        entry_payload,
        entry_hmac
    )
    VALUES (
        v_timestamp,
        p_actor_id,
        p_actor_role,
        p_resource_type,
        p_resource_id,
        p_action,
        p_ip_fingerprint,
        p_user_agent_fingerprint,
        p_request_id,
        v_previous.id,
        COALESCE(v_previous.entry_hmac, 'GENESIS'),
        p_previous_state_hash,
        p_current_state_hash,
        COALESCE(p_entry_payload, '{}'::jsonb),
        compute_audit_entry_hmac(
            p_secret,
            COALESCE(v_previous.entry_hmac, 'GENESIS'),
            v_timestamp,
            p_actor_id,
            p_resource_id,
            p_action,
            p_ip_fingerprint,
            p_previous_state_hash,
            p_current_state_hash,
            COALESCE(p_entry_payload, '{}'::jsonb)
        )
    )
    RETURNING *
    INTO v_new_entry;

    RETURN v_new_entry;
END;
$$;

CREATE OR REPLACE VIEW audit_chain_verification AS
SELECT
    current_entry.id,
    current_entry.chain_sequence,
    current_entry.timestamp,
    current_entry.actor_id,
    current_entry.resource_id,
    current_entry.action,
    current_entry.previous_entry_id,
    previous_entry.entry_hmac AS linked_previous_hmac,
    current_entry.previous_entry_hmac,
    (current_entry.previous_entry_hmac = COALESCE(previous_entry.entry_hmac, 'GENESIS')) AS chain_link_valid
FROM audit_chain_entries current_entry
LEFT JOIN audit_chain_entries previous_entry
    ON previous_entry.id = current_entry.previous_entry_id;
