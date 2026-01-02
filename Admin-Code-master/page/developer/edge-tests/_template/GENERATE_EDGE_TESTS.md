# Edge Tests Page Generator Guide

## Quick Generation Script

To create all edge test pages, use the following pattern. Each page needs 3 files:
1. `index.html` - HTML structure
2. `style.css` - Minimal styles (uses shared CSS)
3. `script.js` - Test scenarios

## Classes to Create

1. ✅ products
2. orders
3. cart
4. wishlist
5. coupon
6. subscriptions
7. transactions
8. gateway-1
9. gateway-2
10. media

(Note: moderations, referrals, users already exist)

## Template Replacements

When creating a new page, replace in all files:
- `Demo` → `{ClassName}` (e.g., `Products`)
- `demo` → `{classname}` (e.g., `products`)
- `/demo/` → `/{classname}/` (e.g., `/products/`)
- `[Edge Tests Demo]` → `[Edge Tests {ClassName}]`
- `EdgeTestsDemo` → `EdgeTests{ClassName}`
- `developer/edge-tests-demo` → `developer/edge-tests-{classname}`

## File Structure

Each page folder should contain:
```
edge-tests-{classname}/
  ├── index.html
  ├── style.css
  └── script.js
```

## Key Changes in script.js

1. Line 2: Change class name in comment
2. Line 148: Change `pageConfig["demo"]` to `pageConfig["{classname}"]`
3. Line 170: Change log message class name
4. Line 173: Change log message class name
5. Line 712: Change cleanup URL from `/demo/cleanup` to `/{classname}/cleanup`
6. Line 760: Change error log class name
7. Line 843-956: Update test scenarios with class-specific endpoints
8. Line 1040: Change `window.EdgeTestsDemo` to `window.EdgeTests{ClassName}`

## API Endpoint Examples

- Products: `/products/create`, `/products/list`, `/products/update/{id}`
- Orders: `/orders/create`, `/orders/list`, `/orders/update/{id}`
- Cart: `/cart/add`, `/cart/list`, `/cart/remove/{id}`
- Wishlist: `/wishlist/add`, `/wishlist/list`, `/wishlist/remove/{id}`
- Coupon: `/coupon/create`, `/coupon/validate`, `/coupon/apply`
- Subscriptions: `/subscriptions/create`, `/subscriptions/list`, `/subscriptions/cancel/{id}`
- Transactions: `/transactions/create`, `/transactions/list`, `/transactions/refund/{id}`
- Gateway-1: `/gateway-1/process`, `/gateway-1/status/{id}`
- Gateway-2: `/gateway-2/process`, `/gateway-2/status/{id}`
- Media: `/media/upload`, `/media/list`, `/media/delete/{id}`

