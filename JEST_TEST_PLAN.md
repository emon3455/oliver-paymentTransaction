# Jest Test Plan - Payment Transactions Registry Store

## Overview
Comprehensive Jest test suite for validating CRUD operations, query filters, validation logic, and edge cases.

---

## Test Categories

### A. CREATE Tests (createTransaction)

1. **Create valid purchase transaction**
   - Verify successful insert with all required fields
   - Assert transaction_id returned
   - Verify DB state contains correct data

2. **Create refund transaction**
   - Test refund direction with parent_transaction_id
   - Verify refund_amount and refund_reason fields

3. **Create with meta payload**
   - Test meta object serialization within MAX_META_BLOB_LENGTH (4096)
   - Verify meta keys match META_KEY_PATTERN

4. **Create with owner_allocations**
   - Test multiple owners with amount_cents
   - Verify serialization within MAX_OWNER_ALLOCATIONS_BLOB_LENGTH (8192)

5. **Create with products array**
   - Test products serialization within MAX_PRODUCTS_BLOB_LENGTH (16384)
   - Verify product structure

6. **FAIL: Invalid direction**
   - Assert ErrorHandler.addError when direction not in TRANSACTION_DIRECTIONS
   - Verify transaction not created

7. **FAIL: Missing required field (order_id)**
   - Assert ErrorHandler.addError on missing order_id
   - Verify transaction not created

8. **FAIL: Meta exceeds size limit**
   - Assert ErrorHandler.addError when meta > MAX_META_BLOB_LENGTH
   - Verify transaction not created

9. **FAIL: Owner_allocations exceeds size limit**
   - Assert ErrorHandler.addError when > MAX_OWNER_ALLOCATIONS_BLOB_LENGTH
   - Verify transaction not created

10. **FAIL: Products exceeds size limit**
    - Assert ErrorHandler.addError when > MAX_PRODUCTS_BLOB_LENGTH
    - Verify transaction not created

11. **FAIL: Invalid meta key pattern**
    - Assert ErrorHandler.addError when meta key doesn't match META_KEY_PATTERN
    - Test keys with special characters, spaces, etc.

12. **Logger failure doesn't break logic**
    - Mock Logger.writeLog to throw error
    - Verify transaction still created successfully
    - Assert ErrorHandler NOT called for logger failure

---

### B. UPDATE Tests (updateTransaction)

13. **Update status field**
    - Update existing transaction status
    - Verify DB change with actual query
    - Assert updated_at timestamp changed

14. **Update refund_amount and refund_reason**
    - Test refund fields update
    - Verify DB reflects changes

15. **Update meta**
    - Test meta merge/replacement logic
    - Verify meta within size limits

16. **Update products**
    - Test products array update
    - Verify serialization

17. **Update with explicit null (unset)**
    - Test `{unset: true}` logic
    - Verify field set to NULL in DB

18. **FAIL: Invalid transaction_id**
    - Assert ErrorHandler.addError when transaction not found
    - Verify no DB changes

19. **FAIL: No updatable fields**
    - Assert ErrorHandler.addError when fields object is empty
    - Verify no DB changes

20. **FAIL: Meta exceeds size limit on update**
    - Assert ErrorHandler.addError
    - Verify original value unchanged

21. **FAIL: Invalid field type**
    - Assert ErrorHandler.addError when type mismatch
    - Test string passed to numeric field, etc.

22. **Logger failure doesn't break logic**
    - Mock Logger.writeLog to throw
    - Verify update still succeeds

---

### C. DELETE Tests (deleteTransaction)

23. **Soft delete transaction**
    - Verify is_deleted=true
    - Verify deleted_at timestamp set
    - Assert transaction still exists in DB

24. **FAIL: Invalid transaction_id**
    - Assert ErrorHandler.addError when transaction not found
    - Verify no DB changes

25. **FAIL: Already deleted transaction**
    - Assert ErrorHandler.addError when attempting to delete already deleted
    - Verify deleted_at unchanged

26. **Logger failure doesn't break logic**
    - Mock Logger.writeLog to throw
    - Verify delete still succeeds

---

### D. READ Tests (getTransaction)

27. **Get transaction by ID**
    - Retrieve existing transaction
    - Verify all fields match created data
    - Verify JSON fields properly deserialized

28. **Get with expanded relations**
    - Test owner_allocations deserialization
    - Test products deserialization
    - Verify array structure

29. **FAIL: Invalid transaction_id**
    - Assert ErrorHandler.addError when transaction not found
    - Return null or throw appropriately

30. **FAIL: Attempt to get deleted transaction**
    - Assert ErrorHandler.addError when is_deleted=true
    - Verify deleted transactions not returned

---

### E. QUERY/LIST Tests (query)

31. **Query with no filters**
    - Test default pagination (limit=20, offset=0)
    - Verify results array structure

32. **Query with pagination**
    - Test custom limit and offset
    - Verify correct number of results
    - Test offset beyond results returns empty array

33. **Query by customer_uid**
    - Filter by specific customer
    - Verify only customer's transactions returned

34. **Query by transaction_id**
    - Filter by specific transaction
    - Verify single result

35. **Query by order_type**
    - Filter by order_type
    - Verify all results match filter

36. **Query by status**
    - Filter by transaction status
    - Test status normalization (uppercase/lowercase)

37. **Query by direction**
    - Filter by purchase/refund/chargeback
    - Verify direction normalization

38. **Query by date range**
    - Filter dateStart to dateEnd
    - Verify DateTime.getStartOfDay and DateTime.getEndOfDay logic
    - Test inclusive boundaries

39. **Query by owner (ownerId/owner_uuid)**
    - Filter by owner in owner_allocations JSON
    - Verify JSON search logic

40. **Query with multiple filters combined**
    - Test compound filters (customer + dateStart + status)
    - Verify AND logic

41. **FAIL: Limit exceeds MAX_LIMIT**
    - Assert limit clamped to MAX_LIMIT=200
    - Verify no error thrown, just clamped

42. **FAIL: Invalid dateStart format**
    - Assert ErrorHandler.addError when invalid date
    - Test various invalid formats

43. **FAIL: Invalid dateEnd format**
    - Assert ErrorHandler.addError when invalid date

44. **FAIL: dateStart > dateEnd**
    - Assert ErrorHandler.addError when date range invalid
    - Verify deltaSeconds validation

45. **Pagination offset beyond results**
    - Return empty array
    - Verify no error thrown

---

### F. Validation & Edge Cases

46. **Currency validation**
    - Test accepted currency codes
    - Verify sanitization

47. **IP address sanitization**
    - Verify IP address field sanitization
    - Test IPv4 and IPv6

48. **Platform field handling**
    - Test platform value sanitization
    - Verify string constraints

49. **Payment method handling**
    - Test payment_method field
    - Verify valid values

50. **User agent handling**
    - Test user_agent field sanitization
    - Verify length limits

---

## Test Execution Guidelines

1. **Run tests one at a time initially** to verify correctness
2. **Show actual DB state** after each operation
3. **Mock PostgreSQL** properly using `__mocks__/PostgreSQL.js`
4. **Assert ErrorHandler.addError** on all FAIL cases
5. **Verify Logger failures** do NOT break core logic
6. **Check serialization limits** with real JSON.stringify sizes
7. **Test pagination** with actual DB queries

---

## Mock Strategy

- **PostgreSQL**: Mock with in-memory data structure
- **Logger**: Mock writeLog, debugLog - verify non-blocking on failure
- **ErrorHandler**: Spy on addError to assert error handling
- **DateTime**: Use real implementation or mock specific methods

---

## Success Criteria

- All 50 tests pass
- ErrorHandler.addError called on all FAIL cases
- Logger failures never break transactions
- DB state verified after mutations
- Serialization limits enforced
- Pagination limits enforced
