BEGIN;

CREATE TABLE IF NOT EXISTS public.email_outbox (
    id BIGSERIAL PRIMARY KEY,

    event_key VARCHAR(255) NOT NULL UNIQUE,

    order_id INTEGER NULL
        REFERENCES public.orders(id)
        ON DELETE SET NULL,

    event_type VARCHAR(50) NOT NULL,

    recipient_email VARCHAR(255) NOT NULL,

    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    status VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE',

    attempts INTEGER NOT NULL DEFAULT 0,

    available_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT NOW(),

    locked_at TIMESTAMP WITH TIME ZONE NULL,

    sent_at TIMESTAMP WITH TIME ZONE NULL,

    last_error TEXT NULL,

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT NOW(),

    CONSTRAINT email_outbox_status_check
        CHECK (
            status IN (
                'EN_ATTENTE',
                'EN_COURS',
                'ENVOYE',
                'ECHEC'
            )
        ),

    CONSTRAINT email_outbox_attempts_check
        CHECK (attempts >= 0)
);

CREATE INDEX IF NOT EXISTS email_outbox_pending_idx
    ON public.email_outbox (status, available_at, created_at);

CREATE INDEX IF NOT EXISTS email_outbox_order_id_idx
    ON public.email_outbox (order_id);

COMMIT;
