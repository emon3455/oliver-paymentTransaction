-- Create transactions table for Payment Registry Store
-- This table stores all payment-related transactions

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    order_id VARCHAR(255),
    amount DECIMAL(20, 2),
    order_type VARCHAR(100),
    customer_uid VARCHAR(255),
    status VARCHAR(50),
    direction VARCHAR(50),
    payment_method VARCHAR(100),
    currency VARCHAR(10),
    platform VARCHAR(100),
    ip_address VARCHAR(50),
    parent_transaction_id INTEGER,
    meta JSONB,
    user_agent TEXT,
    refund_amount DECIMAL(20, 2),
    refund_reason TEXT,
    dispute_id VARCHAR(255),
    write_status VARCHAR(50),
    owners JSONB,
    owner_allocations JSONB,
    products JSONB,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_uid ON transactions(customer_uid);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_direction ON transactions(direction);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_is_deleted ON transactions(is_deleted);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to call the function on update
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
