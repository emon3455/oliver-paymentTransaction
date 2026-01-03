/**
 * Express API Server for Payment Transactions Registry
 * Serves the HTML frontend and provides API endpoints for testing
 */

const express = require('express');
const path = require('path');
const TransactionRegistry = require('./PaymentTransactionsRegistryStore');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static files (Admin-Code-master HTML)
app.use('/Admin-Code-master', express.static(path.join(__dirname, 'Admin-Code-master')));

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/Admin-Code-master/page/developer/edge-tests-transactions/index.html');
});

// ============================================
// API ENDPOINTS
// ============================================

// CREATE Transaction
app.post('/api/transactions', async (req, res) => {
  try {
    console.log('[CREATE] Request Headers:', req.headers['content-type']);
    console.log('[CREATE] Request Body:', req.body);
    console.log('[CREATE] Request Body Keys:', Object.keys(req.body));
    console.log('[CREATE] Body order_id:', req.body.order_id);
    
    const result = await TransactionRegistry.createTransaction(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('[CREATE] Error:', error.message);
    res.status(400).json({ 
      error: error.message,
      details: error.errors || []
    });
  }
});

// QUERY Transactions (MUST come before /:id route)
app.get('/api/transactions/query', async (req, res) => {
  try {
    console.log('[QUERY] Request query params:', req.query);
    
    // Extract pagination parameters
    const { limit, offset, ...filters } = req.query;
    const pagination = {};
    if (limit !== undefined) pagination.limit = parseInt(limit, 10);
    if (offset !== undefined) pagination.offset = parseInt(offset, 10);
    
    console.log('[QUERY] Filters:', filters);
    console.log('[QUERY] Pagination:', pagination);
    
    const result = await TransactionRegistry.query(filters, pagination);
    console.log('[QUERY] Result:', { 
      rows: result.rows?.length || 0, 
      total: result.total 
    });
    
    res.json(result);
  } catch (error) {
    console.error('[QUERY] Error:', error.message);
    res.status(400).json({ 
      error: error.message,
      rows: [],
      total: 0
    });
  }
});

// GET Total Count (MUST come before /:id route)
app.get('/api/transactions/count', async (req, res) => {
  try {
    const result = await TransactionRegistry.getAllCount();
    console.log('[COUNT] Raw result:', result);
    // getAllCount returns a number, not an object with total property
    res.json({ total: result });
  } catch (error) {
    console.error('[COUNT] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET Count by Status (MUST come before /:id route)
app.get('/api/transactions/count/by-status', async (req, res) => {
  try {
    const { status } = req.query;
    if (!status) {
      return res.status(400).json({ error: 'Status parameter is required' });
    }
    const result = await TransactionRegistry.getAllCountByStatus(status);
    console.log('[COUNT BY STATUS] Raw result:', result);
    // getAllCountByStatus returns a number, not an object with total property
    res.json({ status, total: result });
  } catch (error) {
    console.error('[COUNT BY STATUS] Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// GET Transaction by ID (MUST come after specific routes)
app.get('/api/transactions/:id', async (req, res) => {
  try {
    const result = await TransactionRegistry.getTransaction(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(result);
  } catch (error) {
    console.error('[READ] Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 Payment Transactions Registry API Server');
  console.log('='.repeat(60));
  console.log(`📡 API Server: http://localhost:${PORT}`);
  console.log(`🌐 Edge Tests: http://localhost:${PORT}/Admin-Code-master/page/developer/edge-tests-transactions/index.html`);
  console.log('='.repeat(60));
  console.log('📋 API Endpoints:');
  console.log('  POST   /api/transactions');
  console.log('  GET    /api/transactions/:id');
  console.log('  PUT    /api/transactions/:id');
  console.log('  DELETE /api/transactions/:id');
  console.log('  GET    /api/transactions/query');
  console.log('  GET    /api/transactions/count');
  console.log('  GET    /api/transactions/count/by-status?status=...');
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  server.close(async () => {
    await TransactionRegistry.closeConnections();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, closing server...');
  server.close(async () => {
    await TransactionRegistry.closeConnections();
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, TransactionRegistry };
