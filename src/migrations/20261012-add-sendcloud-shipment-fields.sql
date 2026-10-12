
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS sendcloud_status VARCHAR(20)
        NOT NULL DEFAULT 'NON_CREEE',
    ADD COLUMN IF NOT EXISTS sendcloud_shipment_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS sendcloud_parcel_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS sendcloud_tracking_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS sendcloud_tracking_url TEXT,
    ADD COLUMN IF NOT EXISTS sendcloud_label_url TEXT,
    ADD COLUMN IF NOT EXISTS sendcloud_error TEXT,
    ADD COLUMN IF NOT EXISTS sendcloud_created_at TIMESTAMPTZ;