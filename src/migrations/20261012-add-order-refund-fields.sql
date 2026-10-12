BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
          AND t.typname = 'enum_orders_refundStatus'
    ) THEN
        CREATE TYPE public."enum_orders_refundStatus"
        AS ENUM ('AUCUN', 'EN_COURS', 'REUSSI', 'ECHEC');
    END IF;
END
$$;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS refund_status
        public."enum_orders_refundStatus"
        NOT NULL DEFAULT 'AUCUN',
    ADD COLUMN IF NOT EXISTS stripe_refund_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS refund_completed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS refund_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_refund_id_unique
    ON public.orders (stripe_refund_id);

COMMIT;