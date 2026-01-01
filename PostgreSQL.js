"use strict";

const crypto = require("crypto");
const { Pool } = require("pg");

class PostgreSQL {
    static DEFAULT_CONNECTION_NAME = "default";

    static QUERY_LOG_LEVEL_ORDER = Object.freeze({ info: 0, warn: 1, error: 2, off: 3 });

    static deepFreeze(obj) {
        if (!obj || typeof obj !== "object") return obj;
        Object.freeze(obj);
        for (const value of Object.values(obj)) {
            if (value && typeof value === "object" && !Object.isFrozen(value)) {
                PostgreSQL.deepFreeze(value);
            }
        }
        return obj;
    }

    static stableJsonStringify(value) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
            const keys = Object.keys(value).sort();
            const entries = keys.map(
                (key) => `${JSON.stringify(key)}:${PostgreSQL.stableJsonStringify(value[key])}`
            );
            return `{${entries.join(",")}}`;
        }
        if (Array.isArray(value)) {
            return `[${value.map(PostgreSQL.stableJsonStringify).join(",")}]`;
        }
        return JSON.stringify(value);
    }

    static wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    static parseSslOptions() {
        const flag = (process.env.PG_SSL || "").toLowerCase();
        const enabled = flag === "true" || flag === "1";
        return enabled ? { rejectUnauthorized: process.env.PG_SSL_NO_VERIFY !== "1" } : undefined;
    }

    static normalizeQueryLogLevel(level) {
        if (!level || typeof level !== "string") return "info";
        const normalized = level.toLowerCase();
        return Object.prototype.hasOwnProperty.call(PostgreSQL.QUERY_LOG_LEVEL_ORDER, normalized)
            ? normalized
            : "info";
    }

    static INTERNAL_CONFIG;

    static {
        this.INTERNAL_CONFIG = PostgreSQL.deepFreeze({
            dbOptions: {
                queryLogger: ({ name, text, durationMs, error }) => {
                    console.log(
                        `[${name}] ${text.replace(/\s+/g, " ")} (${durationMs}ms) ${error ? "ERR" : "OK"}`
                    );
                },
                queryLogLevel: process.env.NODE_ENV === "production" ? "error" : "info",
                defaultQueryTimeoutMs: 15000,
                defaultLockTimeoutMs: 0,
                defaultIdleInTransactionSessionTimeoutMs: 0,
            },
            connections: {
                default: {
                host: process.env.PGHOST || "postgres",
                    database: process.env.POSTGRES_DB || "oliver_db",
                    user: process.env.POSTGRES_USER || "emon",
                    password: process.env.POSTGRES_PASSWORD || "emon@12",
                    ssl: PostgreSQL.parseSslOptions(),
                },
            },
            tables: {
                Users: {
                    table: "users",
                    connection: "default",
                    columns: ["id", "name", "email"],
                    sensitive: true,
                },
            },
        });
    }

    constructor(opts = {}) {
        this.poolFactory =
            typeof opts.poolFactory === "function"
                ? opts.poolFactory
                : (cfg) => new Pool(cfg);

        this.queryLogger = typeof opts.queryLogger === "function" ? opts.queryLogger : null;

        const DEFAULT_TIMEOUT_MS = 10000;
        this.defaultQueryTimeoutMs =
            Number.isFinite(opts.defaultQueryTimeoutMs) ? opts.defaultQueryTimeoutMs : DEFAULT_TIMEOUT_MS;
        this.defaultLockTimeoutMs = Number.isFinite(opts.defaultLockTimeoutMs) ? opts.defaultLockTimeoutMs : 0;
        this.defaultIdleInTransactionSessionTimeoutMs = Number.isFinite(
            opts.defaultIdleInTransactionSessionTimeoutMs
        )
            ? opts.defaultIdleInTransactionSessionTimeoutMs
            : 0;

        this.defaultConfig = Object.assign(
            {
                user: process.env.POSTGRES_USER || "emon",
                host: process.env.PGHOST || "postgres",
                database: process.env.POSTGRES_DB || "oliver_db",
                password: process.env.POSTGRES_PASSWORD || "emon@12",
                port: parseInt(process.env.PGPORT, 10) || 5432,
                ssl: PostgreSQL.parseSslOptions(),
                max: parseInt(process.env.PG_MAX_CLIENTS || "10", 10),
                idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT_MS || "30000", 10),
                connectionTimeoutMillis: parseInt(
                    process.env.PG_CONN_TIMEOUT_MS || "0",
                    10
                ),
            },
            opts.defaultConfig || {}
        );

        this.connections = {};
        this._ready = {};
        this.errors = [];
        this._preparedStatementNames = new Map();
        this._connectPromises = new Map();
        this._poolStats = new Map();
        const DEFAULT_RETRY_OPTIONS = { attempts: 0, backoffMs: 100 };
        this.retryOptions = Object.assign({}, DEFAULT_RETRY_OPTIONS, opts.retryOptions || {});
        const defaultLevel = process.env.NODE_ENV === "production" ? "error" : "info";
        this.queryLogLevel = PostgreSQL.normalizeQueryLogLevel(opts.queryLogLevel ?? defaultLevel);
        this.lifecycleHooks = {
            onStart: typeof opts.onStart === "function" ? opts.onStart : null,
            onClose: typeof opts.onClose === "function" ? opts.onClose : null,
        };
        this._emitLifecycleHook("onStart", { instance: this, defaultConfig: this.defaultConfig });
    }

    static _isValidSqlIdentifier(id) {
        return typeof id === "string" && /^[A-Za-z_][A-Za-z0-9_]*$/.test(id);
    }

    static _quoteSqlIdentifier(id) {
        if (!PostgreSQL._isValidSqlIdentifier(id)) {
            throw new Error(`Invalid SQL identifier: ${id}`);
        }
        return `"${id.replace(/"/g, '""')}"`;
    }

    static _assertValidIdentifiers(...ids) {
        for (const id of ids) {
            if (!PostgreSQL._isValidSqlIdentifier(id)) throw new Error(`Invalid SQL identifier: ${id}`);
        }
    }

    static _assertValidTableName(name) {
        if (typeof name !== "string" || !name.trim()) {
            throw new Error("Table name must be a non-empty string.");
        }
        const parts = name.split(".");
        for (const part of parts) {
            if (!PostgreSQL._isValidSqlIdentifier(part)) {
                throw new Error(`Invalid table identifier segment: ${part}`);
            }
        }
    }

    static _quoteTableName(name) {
        PostgreSQL._assertValidTableName(name);
        return name.split(".").map((segment) => PostgreSQL._quoteSqlIdentifier(segment)).join(".");
    }

    static _normalizeTableName(name) {
        return name
            .split(".")
            .map((segment) => segment.toLowerCase())
            .join(".");
    }

    static _enforceColumnWhitelist(table, columns) {
        const canonical = PostgreSQL._normalizeTableName(table);
        const whitelist = PostgreSQL._columnWhitelistByTable[canonical];
        if (!whitelist) return;
        for (const col of columns) {
            if (!whitelist.has(col)) {
                throw new Error(`Column "${col}" is not allowed for table "${table}".`);
            }
        }
    }

    static _validateQueryValues(values, context) {
        for (const value of values) {
            if (value === undefined) {
                throw new Error(`${context}: undefined values are not supported.`);
            }
            const type = typeof value;
            if (type === "function" || type === "symbol") {
                throw new Error(`${context}: unsupported value type "${type}".`);
            }
            if (type === "number" && !Number.isFinite(value)) {
                throw new Error(`${context}: non-finite numbers are not supported.`);
            }
            if (value instanceof Date && Number.isNaN(value.getTime())) {
                throw new Error(`${context}: invalid Date value provided.`);
            }
        }
    }

    static _normalizeNonNegativeInteger(name, value) {
        if (value == null) return null;
        if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
            throw new Error(`${name} must be a non-negative integer.`);
        }
        return value;
    }

    static _isSensitiveTable(table) {
        const canonical = PostgreSQL._normalizeTableName(table);
        return Boolean(PostgreSQL._sensitiveTables && PostgreSQL._sensitiveTables.has(canonical));
    }

    registerConnection(name, config = {}) {
        if (!PostgreSQL._isValidSqlIdentifier(name)) {
            throw new Error(`Invalid connection name: ${name}`);
        }
        const record = PostgreSQL._storeConnectionConfig(name, config, this);
        if (this.connections[name]) return this.connections[name];
        const pool =
            record.pool && PostgreSQL._isPool(record.pool)
                ? record.pool
                : this.poolFactory(record.config);
        pool.on("error", (err) => this._recordDbError(err));
        this.connections[name] = pool;
        this._ready[name] = false;
        this._poolStats.set(name, {
            queries: 0,
            errors: 0,
            lastQueryAt: null,
            lastErrorAt: null,
        });
        return pool;
    }

    async ensureConnected(name = "default") {
        if (!this.connections[name]) {
            const cfgEntry = PostgreSQL._connectionConfigs[name];
            if (!cfgEntry) {
                const known = Object.keys(PostgreSQL._connectionConfigs).sort().join(", ") || "<none>";
                throw new Error(
                    `Connection "${name}" is not registered. Known connections: ${known}`
                );
            }
            this.registerConnection(name, cfgEntry.config);
        }
        if (this._ready[name]) return;
        if (this._connectPromises.has(name)) {
            return this._connectPromises.get(name);
        }
        const connectPromise = (async () => {
            const pool = this.connections[name];
            try {
                const cfgEntry = PostgreSQL._connectionConfigs[name];
                const timeoutMs =
                    cfgEntry?.config?.connectionTimeoutMillis ?? this.defaultConfig.connectionTimeoutMillis ?? 0;
                const client = await this._connectWithTimeout(pool, timeoutMs);
                client.release();
                this._ready[name] = true;
            } catch (err) {
                this._ready[name] = false;
                this._recordDbError(err);
                throw err;
            } finally {
                this._connectPromises.delete(name);
            }
        })();
        this._connectPromises.set(name, connectPromise);
        return connectPromise;
    }

    async query(name = "default", text = "", params = [], options = {}) {
        await this.ensureConnected(name);
        const pool = this.connections[name];
        if (!pool) {
            throw new Error(`Connection "${name}" is not registered.`);
        }
        if (typeof text !== "string" || !text.trim()) {
            throw new Error("SQL query text must be a non-empty string.");
        }
        const normalizedText = text.replace(/\s+/g, " ").trim();
        const logSql = options?.logSql !== false && options?.sensitive !== true;
        const loggedText = logSql ? normalizedText : "[REDACTED]";

        const start = Date.now();
        const timeoutMs =
            Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
                ? options.timeoutMs
                : this.defaultQueryTimeoutMs;
        const lockTimeoutMs = Number.isFinite(options.lockTimeoutMs)
            ? Math.max(0, Math.trunc(options.lockTimeoutMs))
            : this.defaultLockTimeoutMs;
        const idleInTxTimeoutMs = Number.isFinite(options.idleInTransactionSessionTimeoutMs)
            ? Math.max(0, Math.trunc(options.idleInTransactionSessionTimeoutMs))
            : this.defaultIdleInTransactionSessionTimeoutMs;

        const finalParams = Array.isArray(params) ? params : [];
        PostgreSQL._assertParamCount(text, finalParams);
        const statementName = options.statementName || this._getPreparedStatementName(text);

        const hasAbortController = typeof AbortController === "function";
        const shouldAutoAbort = !options.abortController && hasAbortController && timeoutMs > 0;
        const abortController =
            options.abortController || (shouldAutoAbort ? new AbortController() : null);
        let abortTimeout = null;
        if (shouldAutoAbort && abortController) {
            abortTimeout = setTimeout(() => abortController.abort(), timeoutMs);
        }

        const executeAttempt = async () => {
            const client = await pool.connect();
            try {
                this._incrementQueryCount(name);
                await this._applySessionTimeouts(client, {
                    statementTimeoutMs: timeoutMs,
                    lockTimeoutMs,
                    idleInTransactionSessionTimeoutMs: idleInTxTimeoutMs,
                });

                const queryArgs = {
                    text,
                    values: finalParams,
                    name: statementName,
                };
                if (abortController) {
                    queryArgs.signal = abortController.signal;
                }

                return await client.query(queryArgs);
            } catch (err) {
                this._recordPoolError(name);
                throw err;
            } finally {
                client.release();
            }
        };

        const retryOptions = Object.assign({}, this.retryOptions, options.retryOptions || {});
        try {
            const result = await this._withRetry(() => executeAttempt(), retryOptions);
            if (this._shouldLog("info")) {
                const durationMs = Date.now() - start;
                this.queryLogger({
                    level: "info",
                    name,
                    text: loggedText,
                    durationMs,
                    paramCount: finalParams.length,
                    result: { rowCount: result.rowCount },
                    error: undefined,
                });
            }
            return result;
        } catch (err) {
            const errorType = PostgreSQL._classifyError(err);
            this._recordDbError(err, { type: errorType });
            if (this._shouldLog("error")) {
                const durationMs = Date.now() - start;
                this.queryLogger({
                    level: "error",
                    name,
                    text: loggedText,
                    durationMs,
                    paramCount: finalParams.length,
                    result: undefined,
                    error: err,
                    errorType,
                });
            }
            throw err;
        } finally {
            if (abortTimeout) clearTimeout(abortTimeout);
        }
    }

    _getPreparedStatementName(text) {
        if (!text) return undefined;
        if (this._preparedStatementNames.has(text)) {
            return this._preparedStatementNames.get(text);
        }
        const hash = crypto.createHash("sha1").update(text).digest("hex");
        const name = `stmt_${hash.slice(0, 16)}`;
        this._preparedStatementNames.set(text, name);
        return name;
    }

    _shouldLog(level) {
        if (!this.queryLogger) return false;
        const normalized = typeof level === "string" ? level.toLowerCase() : "info";
        const order = this.constructor.QUERY_LOG_LEVEL_ORDER || PostgreSQL.QUERY_LOG_LEVEL_ORDER;
        const eventRank = order[normalized] ?? order.info;
        const threshold = order[this.queryLogLevel] ?? order.info;
        return eventRank >= threshold;
    }

    static _configFingerprint(config) {
        return crypto.createHash("sha1").update(PostgreSQL.stableJsonStringify(config)).digest("hex");
    }

    static _storeConnectionConfig(name, rawConfig, dbInstance) {
        if (!rawConfig || typeof rawConfig !== "object") {
            throw new Error(`Connection config for "${name}" must be an object.`);
        }
        const { pool, ...rest } = rawConfig;
        const finalConfig = PostgreSQL.deepFreeze({ ...dbInstance.defaultConfig, ...rest });
        const hash = PostgreSQL._configFingerprint(finalConfig);
        const previous = this._connectionConfigs[name];
        if (previous && previous.hash !== hash) {
            throw new Error(`Connection "${name}" already registered with a different config.`);
        }
        this._connectionConfigs[name] = this._connectionConfigs[name] || {};
        this._connectionConfigs[name].config = finalConfig;
        this._connectionConfigs[name].hash = hash;
        if (pool) {
            this._connectionConfigs[name].pool = pool;
        }
        return this._connectionConfigs[name];
    }

    static _isPool(candidate) {
        return (
            candidate &&
            typeof candidate === "object" &&
            typeof candidate.connect === "function" &&
            typeof candidate.end === "function"
        );
    }

    static _storeTableConfig(flag, cfg) {
        const columns = Array.isArray(cfg.columns) ? Object.freeze([...cfg.columns]) : null;
        const defaultOptions = cfg.defaultOptions
            ? PostgreSQL.deepFreeze({ ...cfg.defaultOptions })
            : {};
        const tableCfg = PostgreSQL.deepFreeze({
            table: cfg.table,
            connection: cfg.connection || cfg.connectionName || "default",
            columns,
            defaultOptions,
            sensitive: Boolean(cfg.sensitive),
        });
        const canonicalName = PostgreSQL._normalizeTableName(cfg.table);
        if (columns) {
            PostgreSQL._columnWhitelistByTable[canonicalName] = new Set(columns);
        }
        if (tableCfg.sensitive) {
            PostgreSQL._sensitiveTables.add(canonicalName);
        }
        this._tableConfigs[flag] = tableCfg;
        return tableCfg;
    }

    static getTableConfig(flag) {
        const config = this._tableConfigs[flag];
        if (!config) return null;
        return {
            table: config.table,
            connection: config.connection,
            columns: config.columns ? [...config.columns] : null,
            defaultOptions: config.defaultOptions ? { ...config.defaultOptions } : {},
            sensitive: Boolean(config.sensitive),
        };
    }

    async getRow(name = "default", text = "", params = [], options = {}) {
        const contextDetail = `getRow on ${name}`;
        try {
            const r = await this.query(name, text, params, options);
            return r.rows[0] || null;
        } catch (err) {
            this._recordDbError(err, { detail: contextDetail });
            throw err;
        }
    }

    async checkHealth(name = "default") {
        const result = await this.query(name, "SELECT 1", [], { timeoutMs: this.defaultQueryTimeoutMs });
        return Boolean(result && result.rowCount === 1);
    }

    async queryAll(name = "default", text = "", params = [], options = {}) {
        const contextDetail = `queryAll on ${name}`;
        const { limit, offset, ...queryOptions } = options || {};
        try {
            const rawText = typeof text === "string" ? text.trim() : "";
            if (!rawText) {
                throw new Error("SQL query text must be a non-empty string for queryAll.");
            }
            const normalizedLimit = PostgreSQL._normalizeNonNegativeInteger("limit", limit);
            const normalizedOffset = PostgreSQL._normalizeNonNegativeInteger("offset", offset);

            let finalText = rawText;
            if (normalizedLimit !== null) {
                finalText = `${finalText} LIMIT ${normalizedLimit}`;
            }
            if (normalizedOffset !== null) {
                finalText = `${finalText} OFFSET ${normalizedOffset}`;
            }

            const r = await this.query(name, finalText, params, queryOptions);
            return r.rows;
        } catch (err) {
            this._recordDbError(err, { detail: contextDetail });
            throw err;
        }
    }

    async insert(name = "default", table = "", data = {}) {
        await this.ensureConnected(name);
        if (!table || typeof data !== "object" || !Object.keys(data).length) {
            throw new Error("Invalid table or data for insert.");
        }

        PostgreSQL._assertValidTableName(table);
        const contextDetail = `insert ${table} on ${name}`;

        try {
            const cols = Object.keys(data);
            cols.forEach((value) => PostgreSQL._assertValidIdentifiers(value));
            PostgreSQL._enforceColumnWhitelist(table, cols);

            // Convert objects/arrays to JSON strings for JSONB columns
            const values = Object.values(data).map(value => {
                if (value !== null && typeof value === 'object') {
                    return JSON.stringify(value);
                }
                return value;
            });
            
            PostgreSQL._validateQueryValues(values, contextDetail);
            const placeholders = cols.map((_, i) => `$${i + 1}`);
            const colList = cols.map((value) => PostgreSQL._quoteSqlIdentifier(value)).join(", ");
            const tableRef = PostgreSQL._quoteTableName(table);

            const sql = `
                 INSERT INTO ${tableRef} (${colList}) 
                 VALUES (${placeholders.join(", ")}) 
                 RETURNING *
            `;

            const sensitive = PostgreSQL._isSensitiveTable(table);
            const res = await this.query(name, sql, values, sensitive ? { sensitive: true, logSql: false } : {});
            return res.rows[0] || null;
        } catch (err) {
            this._recordDbError(err, { detail: contextDetail });
            throw err;
        }
    }

    static _assertValidWhereClause(where) {
        if (typeof where !== "string" || !where.trim()) {
            throw new Error("WHERE clause must be a non-empty string with placeholders.");
        }
        if (/;|--|\/\*|\*\//.test(where)) {
            throw new Error("WHERE clause contains disallowed characters (;, --, /*, */).");
        }
        if (/["']/.test(where)) {
            throw new Error("WHERE clause must not include string literals. Use placeholders instead.");
        }
        if (!/\$\d+|:([A-Za-z0-9_]+)/.test(where)) {
            throw new Error("WHERE clause must include placeholders ($1 or :name).");
        }
    }

    async update(name = "default", table = "", data = {}, where = "", params = []) {
        const safeTable = table || "<unknown>";
        const contextDetail = `update ${safeTable} on ${name}`;
        try {
            await this.ensureConnected(name);
            if (!table || typeof data !== "object" || !Object.keys(data).length || !where) {
                throw new Error("Invalid table, data, or where clause for update.");
            }

            PostgreSQL._assertValidWhereClause(where);
            PostgreSQL._assertValidTableName(table);
            const keys = Object.keys(data);
            keys.forEach((k) => PostgreSQL._assertValidIdentifiers(k));
            PostgreSQL._enforceColumnWhitelist(table, keys);

            const tableRef = PostgreSQL._quoteTableName(table);

            const values = Object.values(data);
            PostgreSQL._validateQueryValues(values, contextDetail);
            const setClause = keys.map((k, i) => `${PostgreSQL._quoteSqlIdentifier(k)}=$${i + 1}`).join(", ");
            const whereClause = where.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n, 10) + values.length}`);

            const sql = `UPDATE ${tableRef} SET ${setClause} WHERE ${whereClause} RETURNING *`;
            const finalParams = [...values, ...params];
            PostgreSQL._assertParamCount(sql, finalParams);
            const sensitive = PostgreSQL._isSensitiveTable(table);
            const res = await this.query(
                name,
                sql,
                finalParams,
                sensitive ? { sensitive: true, logSql: false } : {}
            );
            return res.rows;
        } catch (err) {
            this._recordDbError(err, { detail: contextDetail });
            throw err;
        }
    }

    async delete(name = "default", table = "", where = "", params = []) {
        const safeTable = table || "<unknown>";
        const contextDetail = `delete ${safeTable} on ${name}`;
        try {
            await this.ensureConnected(name);

            if (!table || !where) {
                throw new Error("Invalid table or where clause for delete.");
            }

            PostgreSQL._assertValidWhereClause(where);
            PostgreSQL._assertValidTableName(table);

            const tableRef = PostgreSQL._quoteTableName(table);
            const sql = `DELETE FROM ${tableRef} WHERE ${where} RETURNING *`;
            PostgreSQL._assertParamCount(sql, params);

            const sensitive = PostgreSQL._isSensitiveTable(table);
            const res = await this.query(name, sql, params, sensitive ? { sensitive: true, logSql: false } : {});
            return res.rows;
        } catch (err) {
            this._recordDbError(err, { detail: contextDetail });
            throw err;
        }
    }

    static _mapNamedParameters(where, params = {}) {
        if (!params || typeof params !== "object") return { text: where, values: [] };
        if (Array.isArray(params)) return { text: where, values: params };

        const normalizedParams = {};
        for (const [key, value] of Object.entries(params)) {
            const name = key.startsWith(":") ? key.slice(1) : key;
            normalizedParams[name] = value;
        }

        const values = [];
        const seen = new Map();
        let missing;

        const text = where.replace(/:([A-Za-z0-9_]+)/g, (_match, name) => {
            if (!Object.prototype.hasOwnProperty.call(normalizedParams, name)) {
                missing = name;
                return _match;
            }
            if (!seen.has(name)) {
                values.push(normalizedParams[name]);
                seen.set(name, values.length);
            }
            return `$${seen.get(name)}`;
        });

        if (missing) {
            throw new Error(`Missing named parameter ":${missing}" for WHERE clause.`);
        }

        return { text, values };
    }

    static _highestPlaceholderIndex(text) {
        if (!text) return 0;
        const regex = /\$(\d+)/g;
        let highest = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const idx = Number.parseInt(match[1], 10);
            if (!Number.isNaN(idx)) {
                highest = Math.max(highest, idx);
            }
        }
        return highest;
    }

    static _classifyError(err) {
        if (!err) return "unknown";
        const code = typeof err.code === "string" ? err.code : "";
        if (code.startsWith("08") || /ECONN|ENET|EHOST|ETIMEDOUT/.test(code) || /connection/i.test(err.message || "")) {
            return "connection";
        }
        if (code.startsWith("42") || /syntax|invalid/i.test(err.message || "")) {
            return "syntax";
        }
        return "query";
    }

    static _assertParamCount(text, params = []) {
        const expected = PostgreSQL._highestPlaceholderIndex(text);
        if (expected > params.length) {
            throw new Error(
                `SQL uses $${expected} but only ${params.length} parameter(s) were provided.`
            );
        }
    }

    _incrementQueryCount(name) {
        const stats = this._poolStats.get(name);
        if (!stats) return;
        stats.queries += 1;
        stats.lastQueryAt = Date.now();
    }

    _recordPoolError(name) {
        const stats = this._poolStats.get(name);
        if (!stats) return;
        stats.errors += 1;
        stats.lastErrorAt = Date.now();
    }

    async _applySessionTimeouts(
        client,
        { statementTimeoutMs = 0, lockTimeoutMs = 0, idleInTransactionSessionTimeoutMs = 0 } = {}
    ) {
        const next = {
            statementTimeoutMs: Math.max(0, Math.trunc(statementTimeoutMs)),
            lockTimeoutMs: Math.max(0, Math.trunc(lockTimeoutMs)),
            idleInTransactionSessionTimeoutMs: Math.max(0, Math.trunc(idleInTransactionSessionTimeoutMs)),
        };
        const prev = client.__dbSessionTimeouts || {};

        if (prev.statementTimeoutMs !== next.statementTimeoutMs) {
            await client.query(`SET statement_timeout = ${next.statementTimeoutMs}`);
        }
        if (prev.lockTimeoutMs !== next.lockTimeoutMs) {
            await client.query(`SET lock_timeout = ${next.lockTimeoutMs}`);
        }
        if (prev.idleInTransactionSessionTimeoutMs !== next.idleInTransactionSessionTimeoutMs) {
            await client.query(`SET idle_in_transaction_session_timeout = ${next.idleInTransactionSessionTimeoutMs}`);
        }

        client.__dbSessionTimeouts = next;
    }

    async _connectWithTimeout(pool, timeoutMs) {
        if (!timeoutMs || timeoutMs <= 0) {
            return pool.connect();
        }
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Connection timeout after ${timeoutMs}ms`)), timeoutMs);
        });
        try {
            return await Promise.race([pool.connect(), timeoutPromise]);
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    async _withRetry(operation, { attempts = 0, backoffMs = 0 } = {}) {
        const maxAttempts = Math.max(1, attempts + 1);
        let lastError;
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            try {
                return await operation(attempt);
            } catch (err) {
                lastError = err;
                const shouldRetry = attempt < maxAttempts - 1 && this._shouldRetryError(err);
                if (!shouldRetry) {
                    throw err;
                }
                if (backoffMs > 0) {
                    await PostgreSQL.wait(backoffMs * (attempt + 1));
                }
            }
        }
        throw lastError;
    }

    _shouldRetryError(err) {
        if (!err) return false;
        if (err.name === "AbortError") return false;
        const retryCodes = new Set(["40001", "40P01", "55P03"]);
        const code = typeof err.code === "string" ? err.code : "";
        if (retryCodes.has(code)) return true;
        return PostgreSQL._classifyError(err) === "connection";
    }

    static configure({ dbOptions = {}, connections = {}, tables = {} } = {}) {
        const db = this._ensureGlobalInstance(dbOptions);
        for (const [name, cfg] of Object.entries(connections)) {
            PostgreSQL._storeConnectionConfig(name, cfg, db);
            if (!db.connections[name]) {
                db.registerConnection(name, cfg);
            }
        }

        for (const [flag, cfg] of Object.entries(tables)) {
            if (!cfg.table) {
                throw new Error(`Table config for "${flag}" must include a "table" property.`);
            }
            PostgreSQL._assertValidTableName(cfg.table);
            if (Array.isArray(cfg.columns)) {
                cfg.columns.forEach(col => PostgreSQL._assertValidIdentifiers(col));
            }
            const connectionName =
                cfg.connection || cfg.connectionName || this.DEFAULT_CONNECTION_NAME;
            if (cfg.connectionConfig) {
                PostgreSQL._storeConnectionConfig(connectionName, cfg.connectionConfig, db);
            }
            const tableCfg = {
                table: cfg.table,
                connection: connectionName,
                columns: Array.isArray(cfg.columns) ? cfg.columns.slice() : null,
                defaultOptions: cfg.defaultOptions || {},
                sensitive: Boolean(cfg.sensitive),
            };
            PostgreSQL._storeTableConfig(flag, tableCfg);
            if (!db.connections[connectionName]) {
                const connCfgEntry = this._connectionConfigs[connectionName];
                db.registerConnection(connectionName, connCfgEntry?.config || {});
            }
        }

        return this;
    }

    static async query(flag, whereClause, params = {}, options = {}) {
        const config = this._tableConfigs[flag];
        if (!config) {
            throw new Error(`Table flag "${flag}" is not registered.`);
        }
        PostgreSQL._assertValidWhereClause(whereClause);
        const { text, values } = PostgreSQL._mapNamedParameters(whereClause, params);
        const columns = config.columns
            ? config.columns.map(col => PostgreSQL._quoteSqlIdentifier(col)).join(", ")
            : "*";
        const tableRef = PostgreSQL._quoteTableName(config.table);
        const sql = `SELECT ${columns} FROM ${tableRef} WHERE ${text}`;
        PostgreSQL._assertParamCount(sql, values);
        const instance = this._ensureConnection(config.connection);
        const mergedOptions = {
            ...(config.defaultOptions || {}),
            ...options,
            sensitive: Boolean(config.sensitive) || Boolean(options.sensitive),
        };
        if (config.sensitive) mergedOptions.logSql = false;
        const result = await instance.query(config.connection, sql, values, mergedOptions);
        return result.rows;
    }

    static async select(flag, query = {}, options = {}) {
        const config = this._tableConfigs[flag];
        if (!config) {
            throw new Error(`Table flag "${flag}" is not registered.`);
        }

        const where = query?.where && typeof query.where === "object" ? query.where : {};
        const whereIn = query?.whereIn && typeof query.whereIn === "object" ? query.whereIn : {};
        const whereBetween =
            query?.whereBetween && typeof query.whereBetween === "object" ? query.whereBetween : {};

        const selectedColumns = Array.isArray(query.columns) && query.columns.length
            ? query.columns
            : config.columns
                ? [...config.columns]
                : null;

        if (selectedColumns) {
            selectedColumns.forEach((c) => PostgreSQL._assertValidIdentifiers(c));
            PostgreSQL._enforceColumnWhitelist(config.table, selectedColumns);
        }

        const selectList = selectedColumns
            ? selectedColumns.map((c) => PostgreSQL._quoteSqlIdentifier(c)).join(", ")
            : "*";

        const values = [];
        const clauses = [];

        for (const [col, value] of Object.entries(where)) {
            PostgreSQL._assertValidIdentifiers(col);
            PostgreSQL._enforceColumnWhitelist(config.table, [col]);
            values.push(value);
            clauses.push(`${PostgreSQL._quoteSqlIdentifier(col)} = $${values.length}`);
        }

        for (const [col, list] of Object.entries(whereIn)) {
            PostgreSQL._assertValidIdentifiers(col);
            PostgreSQL._enforceColumnWhitelist(config.table, [col]);
            if (!Array.isArray(list) || list.length === 0) {
                throw new Error(`whereIn.${col} must be a non-empty array.`);
            }
            const placeholders = [];
            for (const item of list) {
                values.push(item);
                placeholders.push(`$${values.length}`);
            }
            clauses.push(`${PostgreSQL._quoteSqlIdentifier(col)} IN (${placeholders.join(", ")})`);
        }

        for (const [col, range] of Object.entries(whereBetween)) {
            PostgreSQL._assertValidIdentifiers(col);
            PostgreSQL._enforceColumnWhitelist(config.table, [col]);
            if (!Array.isArray(range) || range.length !== 2) {
                throw new Error(`whereBetween.${col} must be an array of [from, to].`);
            }
            values.push(range[0], range[1]);
            clauses.push(`${PostgreSQL._quoteSqlIdentifier(col)} BETWEEN $${values.length - 1} AND $${values.length}`);
        }

        const keyset = query.keyset;
        if (keyset && typeof keyset === "object" && keyset.column && keyset.value !== undefined) {
            const col = keyset.column;
            PostgreSQL._assertValidIdentifiers(col);
            PostgreSQL._enforceColumnWhitelist(config.table, [col]);
            const dir = String(keyset.direction || "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC";
            const op = dir === "DESC" ? "<" : ">";
            values.push(keyset.value);
            clauses.push(`${PostgreSQL._quoteSqlIdentifier(col)} ${op} $${values.length}`);
        }

        const tableRef = PostgreSQL._quoteTableName(config.table);
        let sql = `SELECT ${selectList} FROM ${tableRef}`;
        if (clauses.length) {
            sql += ` WHERE ${clauses.join(" AND ")}`;
        }

        const orderBy = query.orderBy || (keyset && keyset.column ? { column: keyset.column, direction: keyset.direction } : null);
        const orderParts = [];
        const normalizeDirection = (dir) => (String(dir || "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC");
        if (Array.isArray(orderBy)) {
            for (const item of orderBy) {
                const col = item?.column;
                if (!col) continue;
                PostgreSQL._assertValidIdentifiers(col);
                PostgreSQL._enforceColumnWhitelist(config.table, [col]);
                orderParts.push(`${PostgreSQL._quoteSqlIdentifier(col)} ${normalizeDirection(item.direction)}`);
            }
        } else if (orderBy && typeof orderBy === "object") {
            const col = orderBy.column;
            if (col) {
                PostgreSQL._assertValidIdentifiers(col);
                PostgreSQL._enforceColumnWhitelist(config.table, [col]);
                orderParts.push(`${PostgreSQL._quoteSqlIdentifier(col)} ${normalizeDirection(orderBy.direction)}`);
            }
        }
        if (orderParts.length) {
            sql += ` ORDER BY ${orderParts.join(", ")}`;
        }

        const limit = PostgreSQL._normalizeNonNegativeInteger("limit", query.limit);
        const offset = PostgreSQL._normalizeNonNegativeInteger("offset", query.offset);
        if (limit !== null) sql += ` LIMIT ${limit}`;
        if (offset !== null) sql += ` OFFSET ${offset}`;

        PostgreSQL._validateQueryValues(values, `select ${flag}`);
        const instance = this._ensureConnection(config.connection);
        const mergedOptions = {
            ...(config.defaultOptions || {}),
            ...options,
            sensitive: Boolean(config.sensitive) || Boolean(options.sensitive),
        };
        if (config.sensitive) mergedOptions.logSql = false;
        const result = await instance.query(config.connection, sql, values, mergedOptions);
        return result.rows;
    }

    static _ensureGlobalInstance(dbOptions = {}) {
        if (!this._globalInstance) {
            this._globalInstance = new this(dbOptions);
        }
        return this._globalInstance;
    }

    static _ensureConnection(name) {
        const db = this._ensureGlobalInstance();
        if (!db.connections[name]) {
            const cfgEntry = this._connectionConfigs[name];
            db.registerConnection(name, cfgEntry?.config || {});
        }
        return db;
    }

    static getPoolStats(name = this.DEFAULT_CONNECTION_NAME) {
        const db = this._ensureGlobalInstance();
        return db.getPoolStats(name);
    }

    static getAllPoolStats() {
        const db = this._ensureGlobalInstance();
        const stats = {};
        for (const name of Object.keys(db.connections)) {
            stats[name] = db.getPoolStats(name);
        }
        return stats;
    }

    static installShutdownHooks({ timeoutMs = 5000, signals = ["SIGTERM", "SIGINT"] } = {}) {
        if (this._shutdownHooksInstalled) return this;
        this._shutdownHooksInstalled = true;
        let closing = false;

        const handler = async (signal) => {
            if (closing) return;
            closing = true;
            const db = this._globalInstance;
            if (!db) {
                process.exit(0);
                return;
            }
            let timer;
            try {
                await Promise.race([
                    db.closeAllConnections(),
                    new Promise((_, reject) => {
                        timer = setTimeout(
                            () => reject(new Error(`Shutdown timed out after ${timeoutMs}ms (${signal})`)),
                            timeoutMs
                        );
                    }),
                ]);
                process.exit(0);
            } catch (err) {
                console.error("Failed to shutdown DB cleanly:", err);
                process.exit(1);
            } finally {
                if (timer) clearTimeout(timer);
            }
        };

        for (const sig of signals) {
            process.once(sig, () => void handler(sig));
        }
        return this;
    }

    async transaction(name = "default", work) {
        await this.ensureConnected(name);
        const pool = this.connections[name];
        const client = await pool.connect();
        const currentDepth = client.__dbTxDepth || 0;
        const nextDepth = currentDepth + 1;
        const savepointName = `sp_${nextDepth}`;
        client.__dbTxDepth = nextDepth;
        try {
            if (currentDepth === 0) {
                await client.query("BEGIN");
            } else {
                console.warn(`Nested transaction detected on connection "${name}" (depth ${currentDepth}); using savepoint ${savepointName}.`);
                await client.query(`SAVEPOINT ${savepointName}`);
            }
            await client.query(`SET LOCAL statement_timeout = ${Math.max(0, Math.trunc(this.defaultQueryTimeoutMs))}`);
            await client.query(`SET LOCAL lock_timeout = ${Math.max(0, Math.trunc(this.defaultLockTimeoutMs))}`);
            await client.query(`SET LOCAL idle_in_transaction_session_timeout = ${Math.max(0, Math.trunc(this.defaultIdleInTransactionSessionTimeoutMs))}`);
            const result = await work({
                query: (text, params = [], options = {}) =>
                    client.query({
                        text,
                        values: params,
                        name: options.statementName,
                    }),
            });
            if (currentDepth === 0) {
                await client.query("COMMIT");
            } else {
                await client.query(`RELEASE SAVEPOINT ${savepointName}`);
            }
            return result;
        } catch (err) {
            try {
                if (currentDepth === 0) {
                    await client.query("ROLLBACK");
                } else {
                    await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
                }
            } catch (rollbackErr) {
                this._recordDbError(rollbackErr, { detail: "rollback failure" });
                console.error("Failed to rollback transaction:", rollbackErr);
            }
            this._recordDbError(err);
            throw err;
        } finally {
            if (currentDepth === 0) {
                delete client.__dbTxDepth;
            } else {
                client.__dbTxDepth = currentDepth;
            }
            client.release();
        }
    }

    getErrorLog() {
        return this.errors.slice();
    }

    _recordDbError(err, meta = {}) {
        this.errors.push({
            ts: Date.now(),
            msg: err?.message || String(err),
            stack: err?.stack,
            type: meta.type || PostgreSQL._classifyError(err),
            detail: meta.detail,
        });
        // Optional: cap memory
        if (this.errors.length > 200) this.errors.splice(0, this.errors.length - 200);
    }

    _emitLifecycleHook(name, payload) {
        const hook = this.lifecycleHooks?.[name];
        if (!hook) return;
        try {
            const result = hook(payload);
            if (result && typeof result.then === "function") {
                result.catch((err) => this._recordDbError(err, { detail: `hook ${name}` }));
            }
        } catch (err) {
            this._recordDbError(err, { detail: `hook ${name}` });
        }
    }

    async closeConnection(name) {
        const pool = this.connections[name];
        if (!pool) return;
        try {
            await pool.end();
        } finally {
            delete this.connections[name];
            delete this._ready[name];
            this._connectPromises.delete(name);
            this._poolStats.delete(name);
        }
    }

    getPoolStats(name) {
        const stats = this._poolStats.get(name);
        if (!stats) return null;
        return { ...stats };
    }

    async closeAllConnections() {
        const names = Object.keys(this.connections);
        for (const name of names) {
            try {
                await this.closeConnection(name);
            } catch (err) {
                this._recordDbError(err, { detail: `closing pool ${name}` });
                console.error(`Failed to close pool "${name}":`, err);
            }
        }
        this.connections = {};
        this._ready = {};
        this._connectPromises.clear();
        this._poolStats.clear();
        this._emitLifecycleHook("onClose", { instance: this, closedConnections: names });
    }
}

PostgreSQL._globalInstance = null;
PostgreSQL._tableConfigs = {};
PostgreSQL._connectionConfigs = {};
PostgreSQL._columnWhitelistByTable = {};
PostgreSQL._sensitiveTables = new Set();
PostgreSQL._shutdownHooksInstalled = false;

PostgreSQL.configure(PostgreSQL.INTERNAL_CONFIG);

module.exports = PostgreSQL;

/* -------------------------- Example usage script --------------------------
require("dotenv").config();
const PostgreSQL = require("./db");

(async () => {
  const db = new PostgreSQL({
    queryLogger: ({ name, text, durationMs, error }) => {
      // Minimal logger; avoid logging full params for PII
      console.log(`[${name}] ${text.split("\n").join(" ")} (${durationMs}ms) ${error ? "ERR" : "OK"}`);
    },
    defaultQueryTimeoutMs: 15000,
  });

  // Optional: custom connection name "default"
  db.registerConnection("default", {
    host: process.env.PGHOST || "127.0.0.1",
    database: process.env.POSTGRES_DB || "postgres",
  });

  try {
    const now = await db.getRow("default", "SELECT NOW() AS now");
    console.log("NOW:", now);

    const inserted = await db.insert("default", "users", { name: "Jane", email: "jane@example.com" });
    console.log("Inserted:", inserted);

    const updated = await db.update(
      "default",
      "users",
      { email: "jane.new@example.com" },
      "id=$1",
      [inserted.id]
    );
    console.log("Updated:", updated);

    const deleted = await db.delete("default", "users", "id=$1", [inserted.id]);
    console.log("Deleted:", deleted);

    // Transaction example
    const result = await db.transaction("default", async ({ query }) => {
      const a = await query("INSERT INTO accounts(name, balance) VALUES($1,$2) RETURNING *", ["A", 100]);
      const b = await query("INSERT INTO accounts(name, balance) VALUES($1,$2) RETURNING *", ["B", 100]);
      await query("UPDATE accounts SET balance=balance-50 WHERE id=$1", [a.rows[0].id]);
      await query("UPDATE accounts SET balance=balance+50 WHERE id=$1", [b.rows[0].id]);
      return { a: a.rows[0], b: b.rows[0] };
    });
    console.log("Tx:", result);
  } catch (e) {
    console.error("Error:", e);
    console.error("Collected errors:", db.getErrorLog());
  } finally {
    await db.closeAllConnections();
  }
})();
-------------------------------------------------------------------------- */


/*
Jest mocking — easy now (inject a fake Pool)
// db.mock.test.js
"use strict";

const PostgreSQL = require("./db");

// A minimal Pool-like fake with failure injection hooks
class FakePool {
  constructor(options = {}) {
    this._connected = false;
    this._failNextConnect = Boolean(options.failNextConnect);
    this._nextQueryError = options.nextQueryError || null;
  }
  async connect() {
    if (this._failNextConnect) {
      this._failNextConnect = false;
      throw new Error("Simulated connection failure");
    }
    this._connected = true;
    return { release() {} };
  }
  setNextQueryError(err = { message: "simulated failure", code: "40001" }) {
    this._nextQueryError = err;
  }
  async query({ text, values }) {
    if (this._nextQueryError) {
      const err = new Error(this._nextQueryError.message || "Simulated query failure");
      if (this._nextQueryError.code) err.code = this._nextQueryError.code;
      this._nextQueryError = null;
      throw err;
    }
    if (/^select now\(\)/i.test(text)) {
      return { rows: [{ now: "2025-10-16T12:00:00.000Z" }] };
    }
    if (/^insert into "users"/i.test(text)) {
      return { rows: [{ id: 123, name: values[0], email: values[1] }] };
    }
    if (/^update "users"/i.test(text)) {
      return { rows: [{ id: values[2], email: values[0] }] };
    }
    if (/^delete from "users"/i.test(text)) {
      return { rows: [{ id: values[0] }] };
    }
    return { rows: [] };
  }
  async end() {}
}

test("PostgreSQL works with injected FakePool", async () => {
  const fakePool = new FakePool();
  const db = new PostgreSQL({
    poolFactory: () => fakePool,
    defaultQueryTimeoutMs: 1000,
  });

  fakePool.setNextQueryError({ message: "boom", code: "40001" });

  db.registerConnection("test");

  await expect(db.getRow("test", "SELECT NOW()")).resolves.toBeTruthy();
  await expect(db.insert("test", "users", { name: "Jane", email: "jane@x.com" })).rejects.toThrow(
    /boom/
  );

  await db.closeAllConnections();
});

Why your original was “hard with Jest”

It constructs a real new Pool() internally, so tests must talk to a real DB or you need to monkey-patch pg. With the new constructor’s poolFactory, you skip that and inject a fake (or plug in pg-mem) → easy unit tests, no sockets.

Security notes (what was fixed / added)

Identifier injection: INSERT/UPDATE/DELETE built SQL with ${table} and ${key}. Now we strictly validate and quote identifiers. Keep your app’s allowlist of table/column names if you want even stricter control.

Values already used placeholders ($1, $2) — good.

Optional SSL enforcement via env (PGSSL=require).

Timeouts to prevent hung tests/queries.

Transactions for atomic operations.

How to extend cleanly

Read replica / writer: call registerConnection("reader", {...}) and registerConnection("writer", {...}); choose which to hit per query.

Per-tenant pools: register per tenant key; LRU close old ones if needed.

Query interceptors: you already have queryLogger; you can add a lightweight “beforeQuery/afterQuery” pair if you need redaction, tracing headers, or OpenTelemetry.

Typed helpers: add upsert(), bulkInsert(), or table mappers that generate column allowlists automatically from a schema object.
*/
