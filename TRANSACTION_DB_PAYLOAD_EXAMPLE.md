# Transaction Database Payload Example

## Full Transaction Record (Complete Payload)

```json
{
  "transaction_id": "txn_1234567890",
  "order_id": "order_ABC123XYZ",
  "order_type": "product",
  "customer_uid": "customer_alice_uuid_12345",
  "amount": 15000,
  "status": "completed",
  "direction": "purchase",
  "payment_method": "stripe",
  "currency": "USD",
  "platform": "web",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "refund_amount": null,
  "refund_reason": null,
  "dispute_id": null,
  "meta": {
    "subscription_id": "sub_123456",
    "billing_cycle": "monthly",
    "promo_code": "SAVE20",
    "affiliate_id": "aff_789",
    "customer_notes": "Priority delivery requested",
    "internal_notes": "VIP customer",
    "tax_rate": 0.08,
    "shipping_cost": 500,
    "discount_applied": 2000,
    "nested_data": {
      "level1": {
        "level2": {
          "deep_value": "test"
        }
      }
    },
    "array_data": ["item1", "item2", "item3"]
  },
  "owners": [
    "owner_uuid_primary_12345",
    "owner_uuid_secondary_67890",
    "owner_uuid_tertiary_54321"
  ],
  "owner_allocations": [
    {
      "owner_uuid": "owner_uuid_primary_12345",
      "amount_cents": 9000,
      "percentage": 60.0,
      "allocation_type": "revenue_share"
    },
    {
      "owner_uuid": "owner_uuid_secondary_67890",
      "amount_cents": 4500,
      "percentage": 30.0,
      "allocation_type": "revenue_share"
    },
    {
      "owner_uuid": "owner_uuid_tertiary_54321",
      "amount_cents": 1500,
      "percentage": 10.0,
      "allocation_type": "referral_bonus"
    }
  ],
  "products": [
    {
      "product_id": "prod_premium_001",
      "name": "Premium Subscription - Annual",
      "category": "subscription",
      "price": 12000,
      "quantity": 1,
      "sku": "SUB-PREM-ANN-001"
    },
    {
      "product_id": "prod_addon_002",
      "name": "Extra Storage 100GB",
      "category": "addon",
      "price": 3000,
      "quantity": 1,
      "sku": "ADDON-STOR-100-002"
    }
  ],
  "created_at": "2026-01-03T10:30:45.123Z",
  "updated_at": "2026-01-03T10:30:45.123Z",
  "deleted_at": null,
  "is_deleted": false
}
```

## Field Descriptions

### Required Fields
- **transaction_id**: Unique identifier (auto-generated)
- **order_id**: External order reference (required on create)
- **amount**: Transaction amount in cents (required on create)
- **order_type**: Type of order (product, subscription, etc.)
- **customer_uid**: Customer identifier (required on create)
- **status**: Transaction status (pending, completed, failed, refunded)
- **direction**: purchase, refund, payout, adjustment
- **payment_method**: Payment gateway/method used (required on create)
- **currency**: ISO currency code (required on create)
- **platform**: web, mobile, api, etc. (required on create)

### Optional Fields  
- **payment_method**: Payment gateway/method used
- **currency**: ISO currency code (default: USD)
- **platform**: web, mobile, api, etc.
- **ip_address**: Customer IP address
- **user_agent**: Browser/client user agent
- **refund_amount**: Amount refunded (null if not refunded)
- **refund_reason**: Reason for refund
- **dispute_id**: Associated dispute identifier

### JSONB Fields (Stored as JSON)
- **meta**: Flexible metadata object (max 1MB)
- **owners**: Array of owner UUIDs
- **owner_allocations**: Array of allocation objects with owner_uuid and amount_cents
- **products**: Array of product objects with details

### System Fields
- **created_at**: ISO 8601 timestamp
- **updated_at**: ISO 8601 timestamp  
- **deleted_at**: Soft delete timestamp (null if not deleted)
- **is_deleted**: Boolean soft delete flag

## Mock Data Variants for Testing

### Minimal Transaction (Required Fields Only)
```json
{
  "order_id": "order_MIN_001",
  "amount": 5000,
  "order_type": "product",
  "customer_uid": "cust_test_001",
  "status": "pending",
  "direction": "purchase",
  "payment_method": "stripe",
  "currency": "USD",
  "platform": "web"
}
```

### Refund Transaction
```json
{
  "order_id": "order_REF_001",
  "amount": -3000,
  "order_type": "product",
  "payment_method": "stripe",
  "currency": "USD",
  "platform": "web",
  "customer_uid": "cust_test_002",
  "status": "completed",
  "direction": "refund",
  "refund_amount": 3000,
  "refund_reason": "Customer requested cancellation"
}
```

### Multi-Owner Transaction
```json
{
  "order_id": "order_MULTI_001",
  "amount": 10000,
  "order_type": "subscription",
  "payment_method": "paypal",
  "currency": "USD",
  "platform": "mobile",
  "customer_uid": "cust_test_003",
  "status": "completed",
  "direction": "purchase",
  "owners": ["owner_A", "owner_B", "owner_C"],
  "owner_allocations": [
    { "owner_uuid": "owner_A", "amount_cents": 5000 },
    { "owner_uuid": "owner_B", "amount_cents": 3000 },
    { "owner_uuid": "owner_C", "amount_cents": 2000 }
  ]
}
```

### Transaction with Rich Metadata
```json
{
  "payment_method": "stripe",
  "currency": "USD",
  "platform": "web",
  "order_id": "order_META_001",
  "amount": 8500,
  "order_type": "product",
  "customer_uid": "cust_test_004",
  "status": "completed",
  "direction": "purchase",
  "meta": {
    "campaign_id": "camp_summer_2026",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "summer_sale",
    "device_type": "mobile",
    "browser": "Chrome",
    "conversion_time_ms": 45000,
    "page_views_before_purchase": 7
  },
  "products": [
    {
      "product_id": "prod_001",
      "name": "Widget Pro",
      "price": 5000,
      "quantity": 1
    },
    {
      "product_id": "prod_002",  
      "name": "Extended Warranty",
      "price": 3500,
      "quantity": 1
    }
  ]
}
```

## Database Query Examples

### PostgreSQL Table Structure (Reference)
```sql
CREATE TABLE transactions (
  transaction_id VARCHAR(255) PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL,
  order_type VARCHAR(100),
  customer_uid VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(50),
  direction VARCHAR(50),
  payment_method VARCHAR(100),
  currency VARCHAR(10),
  platform VARCHAR(50),
  ip_address VARCHAR(45),
  user_agent TEXT,
  refund_amount INTEGER,
  refund_reason TEXT,
  dispute_id VARCHAR(255),
  meta JSONB,
  owners JSONB,
  owner_allocations JSONB,
  products JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX idx_transactions_customer ON transactions(customer_uid);
CREATE INDEX idx_transactions_order ON transactions(order_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_direction ON transactions(direction);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_transactions_owners ON transactions USING GIN (owners);
```

## API Payload for Mock Admin Table

For your admin table mock data, use the full payload example above and create variations like:

1. **Recent Transactions** (last 24 hours) - 10-20 records
2. **Various Statuses** - Mix of pending, completed, failed, refunded
3. **Different Customers** - 5-7 different customer_uid values  
4. **Date Range** - Spread across last 30 days
5. **Various Amounts** - Range from $10 to $10,000
6. **Multi-owner Allocations** - At least 3 transactions with multiple owners
7. **Refund Examples** - 2-3 refund transactions with reasons
8. **Rich Metadata** - 5+ transactions with extensive meta fields

This will allow comprehensive testing of filtering, sorting, pagination, and display features in the admin interface.
