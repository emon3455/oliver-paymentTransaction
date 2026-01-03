/**
 * Mock PostgreSQL implementation for testing
 * Provides in-memory data store with CRUD operations
 */

class PostgreSQLMock {
  constructor() {
    this.data = {
      transactions: []
    };
    this.nextId = 1;
  }

  async insert(schema, table, data) {
    if (table === 'transactions') {
      const transaction_id = `txn_${this.nextId++}`;
      const now = new Date().toISOString();
      const record = {
        transaction_id,
        ...data,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        is_deleted: false
      };
      // Store data as-is (JSON strings for JSONB fields)
      this.data.transactions.push(record);
      // Return with parsed JSONB fields (mimicking PostgreSQL driver behavior)
      return { transaction_id, ...this._parseJsonFields(record) };
    }
    throw new Error(`Table ${table} not supported in mock`);
  }

  async update(schema, table, fieldsOrConditions, whereClauseOrUndefined, paramsOrUndefined) {
    if (table === 'transactions') {
      // Support two call patterns:
      // 1. update(schema, table, transaction_id, fields) - from original implementation
      // 2. update(schema, table, fields, whereClause, params) - from deleteTransaction
      
      if (typeof fieldsOrConditions === 'string') {
        // Pattern 1: transaction_id, fields
        const transaction_id = fieldsOrConditions;
        const fields = whereClauseOrUndefined;
        
        const index = this.data.transactions.findIndex(
          t => t.transaction_id === transaction_id && !t.is_deleted
        );
        if (index === -1) {
          throw new Error('Transaction not found');
        }
        const now = new Date().toISOString();
        this.data.transactions[index] = {
          ...this.data.transactions[index],
          ...fields,
          updated_at: now
        };
        return { success: true };
      } else {
        // Pattern 2: fields, whereClause, params
        const fields = fieldsOrConditions;
        const whereClause = whereClauseOrUndefined;
        const params = paramsOrUndefined;
        
        // Parse WHERE clause - e.g., "transaction_id=$1 AND is_deleted=false"
        const transactionId = params && params[0];
        
        const matchingRecords = [];
        for (let i = 0; i < this.data.transactions.length; i++) {
          const t = this.data.transactions[i];
          if (t.transaction_id === transactionId && !t.is_deleted) {
            // Soft delete: set is_deleted and deleted_at
            const now = new Date().toISOString();
            this.data.transactions[i] = {
              ...t,
              ...fields,
              deleted_at: now,
              updated_at: now
            };
            matchingRecords.push(this.data.transactions[i]);
          }
        }
        
        return matchingRecords;
      }
    }
    throw new Error(`Table ${table} not supported in mock`);
  }

  async transaction(schema, callback) {
    // Mock transaction support
    const mockQueryFn = async (sql, params) => {
      // Parse the SQL to determine the operation
      if (sql.includes('SELECT') && sql.includes('FOR UPDATE')) {
        // SELECT ... FOR UPDATE
        const txnId = params[0];
        const record = this.data.transactions.find(
          t => t.transaction_id === txnId && !t.is_deleted
        );
        return { rows: record ? [this._parseJsonFields(record)] : [] };
      } else if (sql.includes('UPDATE')) {
        // UPDATE ... RETURNING *
        const txnId = params[0];
        const index = this.data.transactions.findIndex(
          t => t.transaction_id === txnId && !t.is_deleted
        );
        if (index === -1) {
          return { rows: [] };
        }
        
        // Apply updates from params (params[1] onward are the values)
        const updateValues = params.slice(1);
        const now = new Date().toISOString();
        
        // Parse SET clause to determine which fields to update
        const setMatch = sql.match(/SET (.+?) WHERE/);
        if (setMatch) {
          const setClause = setMatch[1];
          const fieldUpdates = setClause.split(',').map(s => s.trim());
          
          fieldUpdates.forEach((fieldExpr) => {
            // Match "fieldName"=$2 or fieldName=$2
            const fieldMatch = fieldExpr.match(/"?(\w+)"?\s*=\s*\$(\d+)/);
            if (fieldMatch) {
              const fieldName = fieldMatch[1];
              const paramIndex = parseInt(fieldMatch[2], 10);
              const value = params[paramIndex - 1]; // $1 is params[0]
              
              // Store as-is (JSON strings for JSONB fields)
              this.data.transactions[index][fieldName] = value;
            }
          });
        }
        
        this.data.transactions[index].updated_at = now;
        return { rows: [this._parseJsonFields(this.data.transactions[index])] };
      }
      
      return { rows: [] };
    };

    return await callback({ query: mockQueryFn });
  }

  async selectOne(schema, table, conditions) {
    if (table === 'transactions') {
      const record = this.data.transactions.find(t => {
        if (t.is_deleted && !conditions.includeDeleted) return false;
        return Object.entries(conditions).every(([key, value]) => {
          if (key === 'includeDeleted') return true;
          return t[key] === value;
        });
      });
      return record || null;
    }
    throw new Error(`Table ${table} not supported in mock`);
  }

  async getRow(schema, sql, params) {
    // Mock SQL query execution for getTransaction and COUNT queries
    if (sql.includes('COUNT(*)')) {
      // Handle COUNT queries - need to count based on WHERE conditions
      let results = this.data.transactions.filter(t => !t.is_deleted);
      
      // Apply filters from params
      let paramIndex = 0;
      
      if (sql.includes('transaction_id =') && params[paramIndex]) {
        const txnId = params[paramIndex++];
        results = results.filter(t => t.transaction_id === txnId);
      }
      
      if (sql.includes('customer_uid =') && params[paramIndex]) {
        const customerId = params[paramIndex++];
        results = results.filter(t => t.customer_uid === customerId);
      }
      
      if (sql.includes('owners @>') && params[paramIndex]) {
        const ownersJson = params[paramIndex++];
        const ownerIds = JSON.parse(ownersJson);
        results = results.filter(t => {
          let owners = t.owners;
          // Parse if it's a string
          if (typeof owners === 'string') {
            try {
              owners = JSON.parse(owners);
            } catch (e) {
              return false;
            }
          }
          if (!Array.isArray(owners)) return false;
          return ownerIds.some(ownerId => owners.includes(ownerId));
        });
      }
      
      if (sql.includes('order_type =') && params[paramIndex]) {
        const orderType = params[paramIndex++];
        results = results.filter(t => t.order_type === orderType);
      }
      
      if (sql.includes('status =') && params[paramIndex]) {
        const status = params[paramIndex++];
        results = results.filter(t => t.status === status);
      }
      
      if (sql.includes('direction =') && params[paramIndex]) {
        const direction = params[paramIndex++];
        results = results.filter(t => t.direction === direction);
      }
      
      if (sql.includes('created_at >=') && params[paramIndex]) {
        const startDate = new Date(params[paramIndex++]);
        results = results.filter(t => new Date(t.created_at) >= startDate);
      }
      
      if (sql.includes('created_at <=') && params[paramIndex]) {
        const endDate = new Date(params[paramIndex++]);
        results = results.filter(t => new Date(t.created_at) <= endDate);
      }
      
      return { total: results.length };
    }
    
    // Handle SELECT for getTransaction
    if (sql.includes('SELECT') && sql.includes('is_deleted = false')) {
      const txnId = params[0];
      const record = this.data.transactions.find(
        t => t.transaction_id === txnId && !t.is_deleted
      );
      if (record) {
        // Mimic PostgreSQL JSONB auto-parsing
        return this._parseJsonFields(record);
      }
      return null;
    }
    return null;
  }

  // Helper to parse JSON fields like PostgreSQL does for JSONB columns
  _parseJsonFields(record) {
    const parsed = { ...record };
    const jsonFields = ['meta', 'owners', 'owner_allocations', 'products'];
    jsonFields.forEach(field => {
      if (parsed[field] && typeof parsed[field] === 'string') {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch (e) {
          // Leave as-is if parse fails
        }
      }
    });
    return parsed;
  }

  async select(schema, table, conditions = {}, options = {}) {
    if (table === 'transactions') {
      let results = this.data.transactions.filter(t => {
        if (t.is_deleted) return false;
        return Object.entries(conditions).every(([key, value]) => {
          if (value === undefined) return true;
          if (key === 'owner_uuid') {
            // Search in owner_allocations JSON
            if (!t.owner_allocations || !Array.isArray(t.owner_allocations)) return false;
            return t.owner_allocations.some(a => a.owner_uuid === value);
          }
          return t[key] === value;
        });
      });

      // Apply date range filtering
      if (options.dateStart || options.dateEnd) {
        results = results.filter(t => {
          const createdAt = new Date(t.created_at);
          if (options.dateStart && createdAt < new Date(options.dateStart)) return false;
          if (options.dateEnd && createdAt > new Date(options.dateEnd)) return false;
          return true;
        });
      }

      // Apply pagination
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      return results.slice(offset, offset + limit);
    }
    throw new Error(`Table ${table} not supported in mock`);
  }

  async query(schema, sql, params) {
    // Handle UPDATE statements
    if (sql.includes('UPDATE transactions SET')) {
      // Parse SET clause to extract column assignments
      const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/);
      if (!setMatch) {
        throw new Error('Invalid UPDATE SQL');
      }
      
      const setClauses = setMatch[1].split(',').map(s => s.trim());
      const updates = {};
      
      for (const clause of setClauses) {
        const columnMatch = clause.match(/"?(\w+)"?\s*=\s*\$(\d+)/);
        if (columnMatch) {
          const columnName = columnMatch[1];
          const paramIndex = parseInt(columnMatch[2], 10) - 1; // Convert $2 to index 1
          // Store as-is (JSON strings for JSONB fields)
          updates[columnName] = params[paramIndex];
        }
      }
      
      // Extract transaction_id - it's $1, so params[0]
      const txnId = params[0];
      const index = this.data.transactions.findIndex(
        t => t.transaction_id === txnId && !t.is_deleted
      );
      
      if (index === -1) {
        return { rows: [], rowCount: 0 };
      }
      
      const now = new Date().toISOString();
      this.data.transactions[index] = {
        ...this.data.transactions[index],
        ...updates,
        updated_at: now
      };
      
      // Return updated row if RETURNING * is present
      if (sql.includes('RETURNING')) {
        const parsedRow = this._parseJsonFields(this.data.transactions[index]);
        return { rows: [parsedRow], rowCount: 1 };
      }
      
      return { rowCount: 1 };
    }
    
    // Mock SQL query execution for complex queries
    let results = this.data.transactions.filter(t => !t.is_deleted);
    
    // Parse WHERE conditions from params based on SQL structure
    let paramIndex = 0;
    
    // transaction_id filter
    if (sql.includes('transaction_id =') && params[paramIndex]) {
      const txnId = params[paramIndex++];
      results = results.filter(t => t.transaction_id === txnId);
    }
    
    // customer_uid filter
    if (sql.includes('customer_uid =') && params[paramIndex]) {
      const customerId = params[paramIndex++];
      results = results.filter(t => t.customer_uid === customerId);
    }
    
    // owners filter (JSON contains check)
    if (sql.includes('owners @>') && params[paramIndex]) {
      const ownersJson = params[paramIndex++];
      const ownerIds = JSON.parse(ownersJson);
      results = results.filter(t => {
        let owners = t.owners;
        // Parse if it's a string
        if (typeof owners === 'string') {
          try {
            owners = JSON.parse(owners);
          } catch (e) {
            return false;
          }
        }
        if (!Array.isArray(owners)) return false;
        return ownerIds.some(ownerId => owners.includes(ownerId));
      });
    }
    
    // order_type filter
    if (sql.includes('order_type =') && params[paramIndex]) {
      const orderType = params[paramIndex++];
      results = results.filter(t => t.order_type === orderType);
    }
    
    // status filter
    if (sql.includes('status =') && params[paramIndex]) {
      const status = params[paramIndex++];
      results = results.filter(t => t.status === status);
    }
    
    // direction filter (if added)
    if (sql.includes('direction =') && params[paramIndex]) {
      const direction = params[paramIndex++];
      results = results.filter(t => t.direction === direction);
    }
    
    // Date range filters
    const startDateMatch = sql.match(/created_at\s*>=\s*\$(\d+)/);
    if (startDateMatch) {
      const paramIdx = parseInt(startDateMatch[1], 10) - 1;
      const startDate = new Date(params[paramIdx]);
      results = results.filter(t => new Date(t.created_at) >= startDate);
    }
    
    const endDateMatch = sql.match(/created_at\s*<=\s*\$(\d+)/);
    if (endDateMatch) {
      const paramIdx = parseInt(endDateMatch[1], 10) - 1;
      const endDate = new Date(params[paramIdx]);
      results = results.filter(t => new Date(t.created_at) <= endDate);
    }
    
    // Handle COUNT queries
    if (sql.includes('COUNT(*)')) {
      return { rows: [{ total: results.length }] };
    }
    
    // Handle pagination (LIMIT and OFFSET)
    let limit = 20;
    let offset = 0;
    
    if (sql.includes('LIMIT') && params[paramIndex]) {
      limit = parseInt(params[paramIndex++], 10);
    }
    
    if (sql.includes('OFFSET') && params[paramIndex]) {
      offset = parseInt(params[paramIndex++], 10);
    }
    
    const paginatedResults = results.slice(offset, offset + limit);
    // Mimic PostgreSQL JSONB auto-parsing for all rows
    const parsedResults = paginatedResults.map(record => this._parseJsonFields(record));
    return { rows: parsedResults, rowCount: parsedResults.length };
  }

  // Reset mock data between tests
  reset() {
    this.data = {
      transactions: []
    };
    this.nextId = 1;
  }

  // Get all data (for debugging/assertions)
  getAllData(table) {
    return this.data[table] || [];
  }
}

module.exports = PostgreSQLMock;
