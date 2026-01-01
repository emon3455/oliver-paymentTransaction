import crypto from "crypto";
import SafeUtils from "./SafeUtils.js";
import ErrorHandler from "./ErrorHandler.js";
import Logger from "./Logger.js";
import DateTime from "./DateTime.js";
import PostgreSQL from "./PostgreSQL.js";

export default class TransactionRegistry {
  static _db = null;

  static TRANSACTION_DIRECTIONS = Object.freeze([
    "purchase",
    "refund",
    "chargeback",
    "payout",
    "adjustment",
  ]);

  static MAX_LIMIT = 200;
  static MIN_LIMIT = 1;
  static DEFAULT_LIMIT = 20;
  static DEFAULT_OFFSET = 0;
  static STACK_MAX_LENGTH = 4000;
  static CONTEXT_MAX_LENGTH = 2000;
  static FIELDS_PREVIEW_MAX_LENGTH = 1500;
  static META_KEY_PATTERN = /^[a-zA-Z0-9_-]+$/;
  static MAX_META_BLOB_LENGTH = 4096;
  static MAX_OWNER_ALLOCATIONS_BLOB_LENGTH = 8192;
  static MAX_PRODUCTS_BLOB_LENGTH = 16384;

  /** CREATE transaction */
  static async createTransaction(txn) {
    try {
      const cleaned = this._createTransactionSanitizeInput(txn);

      const sanitizedMeta = this._createTransactionSanitizeMeta(cleaned.meta);
      const safeMeta =
        sanitizedMeta === null
          ? null
          : this._createTransactionEnsureSerializableWithLimit(
              sanitizedMeta,
              "meta",
              this.MAX_META_BLOB_LENGTH,
            );

      const sanitizedOwnerAllocations =
        this._createTransactionSanitizeOwnerAllocations(cleaned.owner_allocations);

      const ownerAllocationsPayload =
        this._createTransactionEnsureSerializableWithLimit(
          sanitizedOwnerAllocations,
          "owner_allocations",
          this.MAX_OWNER_ALLOCATIONS_BLOB_LENGTH,
        );

      const normalizedDirection =
        this._createTransactionNormalizeDirection(cleaned.direction);

      const normalizedStatus =
        this._createTransactionNormalizeStatus(cleaned.status);

      const ownersPayload = this._createTransactionEnsureSerializableWithLimit(
        cleaned.owners,
        "owners",
      );
      const productsPayload = this._createTransactionEnsureSerializableWithLimit(
        cleaned.products,
        "products",
        this.MAX_PRODUCTS_BLOB_LENGTH,
      );

      const data = {
        order_id: cleaned.order_id,
        amount: cleaned.amount,
        order_type: cleaned.order_type,
        customer_uid: cleaned.customer_uid,
        status: normalizedStatus,
        direction: normalizedDirection,
        payment_method: cleaned.payment_method,
        currency: cleaned.currency,
        platform: cleaned.platform,
        ip_address: cleaned.ip_address,
        parent_transaction_id: cleaned.parent_transaction_id,
        meta: safeMeta,
        user_agent: cleaned.user_agent,
        refund_amount: cleaned.refund_amount,
        refund_reason: cleaned.refund_reason,
        dispute_id: cleaned.dispute_id,
        write_status: cleaned.write_status,
        owners: ownersPayload,
        owner_allocations: ownerAllocationsPayload,
        products: productsPayload,
        is_deleted: false,
      };

      Logger.debugLog("[TransactionRegistry] createTransaction insert attempt", {
        order_id: cleaned.order_id,
        customer_uid: cleaned.customer_uid,
        direction: normalizedDirection,
        owner_allocations: Array.isArray(ownerAllocationsPayload)
          ? ownerAllocationsPayload.length
          : null,
        owners_count: Array.isArray(ownersPayload) ? ownersPayload.length : null,
        meta_length: (() => {
          if (!safeMeta) return 0;
          try {
            return JSON.stringify(safeMeta).length;
          } catch (err) {
            Logger.debugLog(
              "[TransactionRegistry] createTransaction meta length stringify failed",
              { error: String(err) },
            );
            return null;
          }
        })(),
      });

      const db = this._getDbInstance();
      const result = await db.insert("default", "transactions", data);

      if (!result || !result.transaction_id) {
        throw new Error("Transaction insert failed to return an ID");
      }

      Logger.debugLog("[TransactionRegistry] createTransaction() success", {
        transaction_id: result?.transaction_id,
        order_id: cleaned.order_id,
        order_type: cleaned.order_type,
        customer_uid: cleaned.customer_uid,
      });

      try {
        await Logger.writeLog({
          flag: "transaction",
          action: "transactionCreation",
          message: "Transaction created",
          data: {
            transaction_id: result?.transaction_id,
            order_id: cleaned.order_id,
            order_type: cleaned.order_type,
            customer_uid: cleaned.customer_uid,
            owners: ownersPayload,
            owner_allocations: ownerAllocationsPayload,
          },
        });
      } catch (writeErr) {
        Logger.debugLog("[TransactionRegistry] Logger.writeLog failed", {
          error:
            SafeUtils.sanitizeTextField(
              String(writeErr?.message || writeErr || ""),
            ) || "Unknown error",
          flag: "transaction",
          action: "transactionCreation",
        });
      }

      const safeCustomerUid = SafeUtils.sanitizeTextField(cleaned.customer_uid);
      if (SafeUtils.hasValue(safeCustomerUid)) {
        try {
          await Logger.writeLog({
            flag: "transaction",
            action: "transactionCreationCustomer",
            message: "Transaction created for customer",
            data: {
              transaction_id: result?.transaction_id,
              customer_uid: safeCustomerUid,
              order_id: cleaned.order_id,
            },
          });
        } catch (writeErr) {
          Logger.debugLog("[TransactionRegistry] Logger.writeLog failed", {
            error:
              SafeUtils.sanitizeTextField(
                String(writeErr?.message || writeErr || ""),
              ) || "Unknown error",
            flag: "transaction",
            action: "transactionCreationCustomer",
          });
        }
      }

      if (Array.isArray(ownerAllocationsPayload)) {
        for (const allocation of ownerAllocationsPayload) {
          const ownerUuid = SafeUtils.sanitizeTextField(allocation?.owner_uuid);
          const amountCents = SafeUtils.sanitizeInteger(allocation?.amount_cents);
          if (!SafeUtils.hasValue(ownerUuid) || amountCents === null) continue;
          try {
            await Logger.writeLog({
              flag: "transaction",
              action: "transactionCreationOwner",
              message: "Transaction created for owner",
              data: {
                transaction_id: result?.transaction_id,
                owner_uuid: ownerUuid,
                amount_cents: amountCents,
              },
            });
          } catch (writeErr) {
            Logger.debugLog("[TransactionRegistry] Logger.writeLog failed", {
              error:
                SafeUtils.sanitizeTextField(
                  String(writeErr?.message || writeErr || ""),
                ) || "Unknown error",
              flag: "transaction",
              action: "transactionCreationOwner",
            });
          }
        }
      }
      return result;
    } catch (err) {
      Logger.debugLog("[TransactionRegistry] createTransaction raw error", {
        error: String(err),
        stack: String(err?.stack || "").slice(0, this.STACK_MAX_LENGTH),
        code: SafeUtils.sanitizeTextField(String(err?.code || "")) || null,
      });
      const safeOrderId = SafeUtils.sanitizeTextField(txn?.order_id);
      const errorString =
        SafeUtils.sanitizeTextField(
          String(err?.message || err || ""),
        ) || "Unknown error";
      const stackCandidate = SafeUtils.sanitizeTextField(err?.stack || "");
      const stack = stackCandidate
        ? stackCandidate.slice(0, this.STACK_MAX_LENGTH)
        : null;
      let contextString = "{}";
      try {
        contextString = JSON.stringify({ order_id: safeOrderId });
      } catch (err) {
        Logger.debugLog(
          "[TransactionRegistry] createTransaction error context stringify failed",
          { error: String(err) },
        );
        contextString = "{}";
      }
      const safeContext =
        SafeUtils.sanitizeTextField(
          contextString.slice(0, this.CONTEXT_MAX_LENGTH),
        ) || "{}";
      ErrorHandler.addError("Failed to create transaction", {
        error: errorString,
        stack,
        context: safeContext,
      });
      try {
        await Logger.writeLog({
          flag: "transaction",
          action: "transactionCreation",
          message: "Critical: Failed to create transaction",
          data: {
            error: errorString,
            order_id: safeOrderId,
          },
          critical: true,
        });
      } catch (writeErr) {
        Logger.debugLog("[TransactionRegistry] Logger.writeLog failed", {
          error:
            SafeUtils.sanitizeTextField(
              String(writeErr?.message || writeErr || ""),
            ) || "Unknown error",
          flag: "transaction",
          action: "transactionCreation",
        });
      }
      Logger.debugLog("[TransactionRegistry] createTransaction() failed", {
        order_id: safeOrderId,
        error: errorString,
      });
      throw err;
    }
  }

  /** UPDATE transaction by transaction_id */
  static async updateTransaction(transaction_id, fields) {
    let sanitizedTransactionId = null;
    let existingTransaction = null;
    let customerUidForLog = null;
    try {
      ({
        transaction_id: sanitizedTransactionId,
      } = SafeUtils.sanitizeValidate({
        transaction_id: { value: transaction_id, type: "string", required: true },
      }));

      if (!SafeUtils.isPlainObject(fields)) {
        throw new Error("Fields must be an object");
      }

      const allowedSchema = {
        status: { type: "string", required: false },
        refund_amount: { type: "float", required: false },
        refund_reason: { type: "string", required: false },
        dispute_id: { type: "string", required: false },
        meta: { type: "object", required: false },
        write_status: { type: "string", required: false },
        products: { type: "array", required: false },
      };

      const rawAllowed = {};
      for (const key of Object.keys(allowedSchema)) {
        if (!Object.prototype.hasOwnProperty.call(fields, key)) continue;
        const rawValue = fields[key];
        if (
          SafeUtils.isPlainObject(rawValue) &&
          rawValue.unset === true
        ) {
          rawAllowed[key] = null;
          continue;
        }
        rawAllowed[key] = rawValue;
      }

      if (Object.keys(rawAllowed).length === 0)
        throw new Error("No updatable fields");

      const sanitizeRules = {};
      for (const [key, value] of Object.entries(rawAllowed)) {
        sanitizeRules[key] = {
          value,
          type: allowedSchema[key].type,
          required: false,
        };
      }
      const sanitizedFields = SafeUtils.sanitizeValidate(sanitizeRules);

      const ensureSerializableWithLimit = (value, label, maxLength = null) => {
        if (value === undefined) return undefined;
        try {
          const serialized = JSON.stringify(value);
          if (maxLength !== null && serialized.length > maxLength) {
            throw new TypeError(
              `${label} exceeds maximum length of ${maxLength} characters`,
            );
          }
          return value;
        } catch (err) {
          Logger.debugLog(
            "[TransactionRegistry] ensureSerializableWithLimit stringify failed",
            {
              label,
              error: String(err),
            },
          );
          throw new TypeError(`${label} must be serializable`);
        }
      };

      const sanitizeMetaValue = (rawValue, path) => {
        if (rawValue === undefined) return undefined;
        if (
          typeof rawValue === "string" ||
          typeof rawValue === "number" ||
          typeof rawValue === "boolean"
        ) {
          return rawValue;
        }

        if (Array.isArray(rawValue)) {
          return rawValue
            .map((entry, index) =>
              sanitizeMetaValue(entry, `${path}[${index}]`)
            )
            .filter((entry) => entry !== undefined);
        }

        if (SafeUtils.isPlainObject(rawValue)) {
          const nested = SafeUtils.sanitizeObject(rawValue);
          if (!nested) return null;
          return sanitizeMetaEntries(nested, path);
        }

        if (rawValue === null) return null;
        const sanitizedString = SafeUtils.sanitizeTextField(String(rawValue));
        return sanitizedString === null ? null : sanitizedString;
      };

      const sanitizeMetaEntries = (metaObject, path = "meta") => {
        const result = {};
        for (const [rawKey, rawValue] of Object.entries(metaObject)) {
          const key = SafeUtils.sanitizeTextField(rawKey);
          if (!SafeUtils.hasValue(key)) continue;
          if (!this.META_KEY_PATTERN.test(key)) {
            throw new TypeError(
              `${path}.${key} must match pattern ${this.META_KEY_PATTERN}`,
            );
          }
          const sanitizedValue = sanitizeMetaValue(
            rawValue,
            `${path}.${key}`,
          );
          if (sanitizedValue === undefined) continue;
          result[key] = sanitizedValue;
        }
        return Object.keys(result).length ? result : null;
      };

      const sanitizeMetaPayload = (metaInput) => {
        if (!SafeUtils.hasValue(metaInput)) return null;
        const sanitizedObject = SafeUtils.sanitizeObject(metaInput);
        if (!sanitizedObject) return null;
        return sanitizeMetaEntries(sanitizedObject, "meta");
      };

      const droppedKeys = Object.keys(rawAllowed).filter(
        (key) => !(key in sanitizedFields)
      );
      if (droppedKeys.length > 0) {
        Logger.debugLog("[TransactionRegistry] updateTransaction() sanitized drop", {
          transaction_id: sanitizedTransactionId,
          dropped_fields: droppedKeys,
        });
        throw new Error(
          `updateTransaction(): fields rejected by sanitization: ${droppedKeys.join(
            ", ",
          )}`,
        );
      }

      const updates = {};
      for (const [key, value] of Object.entries(sanitizedFields)) {
        if (value === null) {
          updates[key] = null;
          continue;
        }

        if (key === "meta") {
          const sanitizedMeta = sanitizeMetaPayload(value);
          updates[key] =
            sanitizedMeta === null
              ? null
              : ensureSerializableWithLimit(
                  sanitizedMeta,
                  "meta",
                  this.MAX_META_BLOB_LENGTH,
                );
          continue;
        }

        if (key === "products") {
          updates[key] = ensureSerializableWithLimit(
            value,
            key,
            this.MAX_PRODUCTS_BLOB_LENGTH,
          );
          continue;
        }

        updates[key] = value;
      }

      const updatesPreview = (() => {
        try {
          const serialized = JSON.stringify(updates);
          return (
              SafeUtils.sanitizeTextField(
                serialized.slice(0, this.FIELDS_PREVIEW_MAX_LENGTH),
              ) || "{}"
          );
        } catch (err) {
          Logger.debugLog("[TransactionRegistry] updateTransaction preview failed", {
            transaction_id: sanitizedTransactionId,
            error: String(err),
          });
          return "{}";
        }
      })();

      const updateKeys = Object.keys(updates);
      if (updateKeys.length === 0) throw new Error("No updatable fields");

      Logger.debugLog("[TransactionRegistry] updateTransaction attempt", {
        transaction_id: sanitizedTransactionId,
        field_keys: updateKeys,
        updates_preview: updatesPreview,
      });

      for (const col of updateKeys) {
        if (!/^[a-z_][a-z0-9_]*$/.test(col)) {
          throw new Error(`updateTransaction(): invalid update column "${col}"`);
        }
      }

      const db = this._getDbInstance();
      const { existing, updated, customerUid } = await db.transaction(
        "default",
        async ({ query }) => {
          const existingRes = await query(
            `SELECT * FROM transactions WHERE transaction_id=$1 AND is_deleted=false FOR UPDATE`,
            [sanitizedTransactionId],
          );
          const existingRow =
            existingRes && Array.isArray(existingRes.rows)
              ? existingRes.rows[0] || null
              : null;

          Logger.debugLog("[TransactionRegistry] updateTransaction fetched existing", {
            transaction_id: sanitizedTransactionId,
            found: Boolean(existingRow),
            customer_uid: SafeUtils.sanitizeTextField(existingRow?.customer_uid),
          });

          if (!existingRow) {
            throw new Error("Transaction not found or has been soft-deleted");
          }

          const setClause = updateKeys
            .map((key, index) => `"${key}"=$${index + 2}`)
            .join(", ");
          const values = updateKeys.map((key) => updates[key]);

          const updateRes = await query(
            `UPDATE transactions SET ${setClause} WHERE transaction_id=$1 AND is_deleted=false RETURNING *`,
            [sanitizedTransactionId, ...values],
          );
          const updatedRow =
            updateRes && Array.isArray(updateRes.rows)
              ? updateRes.rows[0] || null
              : null;
          if (!updatedRow) {
            throw new Error("Transaction update failed to return a row");
          }

          return {
            existing: existingRow,
            updated: updatedRow,
            customerUid: SafeUtils.sanitizeTextField(existingRow.customer_uid) || null,
          };
        },
      );

      existingTransaction = existing;
      customerUidForLog = customerUid;
      Logger.debugLog("[TransactionRegistry] updateTransaction db result", {
        transaction_id: sanitizedTransactionId,
        rows_affected: updated ? 1 : 0,
      });

      Logger.debugLog("[TransactionRegistry] updateTransaction() success", {
        transaction_id: sanitizedTransactionId,
        updates: updateKeys,
        customer_uid: customerUidForLog,
      });

      const ownerAllocationsFromRow = (() => {
        const raw = existingTransaction?.owner_allocations;
        if (Array.isArray(raw)) return raw;
        if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch (err) {
            Logger.debugLog(
              "[TransactionRegistry] updateTransaction owner_allocations parse failed",
              {
                transaction_id: sanitizedTransactionId,
                error: String(err),
              },
            );
            return [];
          }
        }
        return [];
      })();
      if (SafeUtils.hasValue(customerUidForLog)) {
        try {
          await Logger.writeLog({
            flag: "transaction",
            action: "transactionUpdateCustomer",
            message: "Transaction updated for customer",
            data: {
              transaction_id: sanitizedTransactionId,
              customer_uid: customerUidForLog,
              updates: updateKeys,
            },
          });
        } catch (writeErr) {
          Logger.debugLog("[TransactionRegistry] Logger.writeLog failed", {
            error:
              SafeUtils.sanitizeTextField(
                String(writeErr?.message || writeErr || ""),
              ) || "Unknown error",
            flag: "transaction",
            action: "transactionUpdateCustomer",
          });
        }
      }
      for (const allocation of ownerAllocationsFromRow) {
        const ownerUuid = SafeUtils.sanitizeTextField(allocation?.owner_uuid);
        const amountCents = SafeUtils.sanitizeInteger(allocation?.amount_cents);
        if (!SafeUtils.hasValue(ownerUuid) || amountCents === null) continue;
        try {
          await Logger.writeLog({
            flag: "transaction",
            action: "transactionUpdateOwner",
            message: "Transaction updated for owner",
            data: {
              transaction_id: sanitizedTransactionId,
              owner_uuid: ownerUuid,
              amount_cents: amountCents,
              updates: updateKeys,
            },
          });
        } catch (writeErr) {
          Logger.debugLog("[TransactionRegistry] Logger.writeLog failed", {
            error:
              SafeUtils.sanitizeTextField(
                String(writeErr?.message || writeErr || ""),
              ) || "Unknown error",
            flag: "transaction",
            action: "transactionUpdateOwner",
          });
        }
      }

      const changedFields = updateKeys.map((key) => ({
        field: key,
        old_value: existingTransaction ? existingTransaction[key] : null,
        new_value: updated ? updated[key] : null,
      }));

      try {
        await Logger.writeLog({
          flag: "transaction",
          action: "transactionUpdate",
          message: "Transaction updated",
          data: {
            transaction_id: sanitizedTransactionId,
            updates: updateKeys,
            changed_fields: changedFields,
            customer_uid: customerUidForLog,
          },
        });
      } catch (writeErr) {
        Logger.debugLog("[TransactionRegistry] Logger.writeLog failed", {
          error:
            SafeUtils.sanitizeTextField(
              String(writeErr?.message || writeErr || ""),
            ) || "Unknown error",
          flag: "transaction",
          action: "transactionUpdate",
        });
      }
      return updated || null;
    } catch (err) {
      Logger.debugLog("[TransactionRegistry] updateTransaction raw error", {
        transaction_id: sanitizedTransactionId,
        error: String(err),
        stack: String(err?.stack || "").slice(0, this.STACK_MAX_LENGTH),
        code: SafeUtils.sanitizeTextField(String(err?.code || "")) || null,
      });
      const fieldsPreview = (() => {
        try {
          const preview = JSON.stringify(fields || {});
          const trimmed = preview.slice(0, this.FIELDS_PREVIEW_MAX_LENGTH);
          return (
            SafeUtils.sanitizeTextField(trimmed) ||
            "{}"
          );
        } catch (err) {
          Logger.debugLog("[TransactionRegistry] updateTransaction fields preview failed", {
            transaction_id: sanitizedTransactionId,
            error: String(err),
          });
          return "{}";
        }
      })();
      const safeTransactionRef =
        SafeUtils.hasValue(sanitizedTransactionId) && sanitizedTransactionId
          ? sanitizedTransactionId
          : SafeUtils.sanitizeTextField(transaction_id);
      const errorString =
        SafeUtils.sanitizeTextField(
          String(err?.message || err || ""),
        ) || "Unknown error";
      const stackCandidate = SafeUtils.sanitizeTextField(err?.stack || "");
      const stack = stackCandidate
        ? stackCandidate.slice(0, this.STACK_MAX_LENGTH)
        : null;
      let contextString = "{}";
      try {
        contextString = JSON.stringify({
          transaction_id: safeTransactionRef,
          fields_preview: fieldsPreview,
        });
      } catch (err) {
        Logger.debugLog(
          "[TransactionRegistry] updateTransaction error context stringify failed",
          { error: String(err) },
        );
        contextString = "{}";
      }
      const safeContext =
        SafeUtils.sanitizeTextField(
          contextString.slice(0, this.CONTEXT_MAX_LENGTH),
        ) || "{}";
      ErrorHandler.addError("Failed to update transaction", {
        error: errorString,
        stack,
        context: safeContext,
      });
      try {
        await Logger.writeLog({
          flag: "transaction",
          action: "transactionUpdate",
          message: "Critical: Failed to update transaction",
          data: {
            error: errorString,
            transaction_id: safeTransactionRef,
            fields_preview: fieldsPreview,
          },
          critical: true,
        });
      } catch (writeErr) {
        Logger.debugLog("[TransactionRegistry] Logger.writeLog failed", {
          error:
            SafeUtils.sanitizeTextField(
              String(writeErr?.message || writeErr || ""),
            ) || "Unknown error",
          flag: "transaction",
          action: "transactionUpdate",
        });
      }
      Logger.debugLog("[TransactionRegistry] updateTransaction() failed", {
        transaction_id: safeTransactionRef,
        error: errorString,
      });
      throw err;
    }
  }

  /** DELETE transaction by transaction_id */
  static async deleteTransaction(transaction_id) {
    let sanitizedTransactionId = null;
    try {
      ({
        transaction_id: sanitizedTransactionId,
      } = SafeUtils.sanitizeValidate({
        transaction_id: { value: transaction_id, type: "string", required: true },
      }));

      Logger.debugLog("[TransactionRegistry] deleteTransaction attempt", {
        transaction_id: sanitizedTransactionId,
      });

      const db = this._getDbInstance();
      const results = await db.update(
        "default",
        "transactions",
        { is_deleted: true },
        "transaction_id=$1 AND is_deleted=false",
        [sanitizedTransactionId],
      );

      const rowsAffected =
        Array.isArray(results) ? results.length : 0;
      Logger.debugLog("[TransactionRegistry] deleteTransaction delete result", {
        transaction_id: sanitizedTransactionId,
        rows_affected: rowsAffected,
      });

      Logger.debugLog("[TransactionRegistry] deleteTransaction() success", {
        transaction_id: sanitizedTransactionId,
      });

      try {
        await Logger.writeLog({
          flag: "transaction",
          action: "deleteTransaction",
          message: "Transaction deleted",
          data: {
            transaction_id: sanitizedTransactionId,
          },
        });
      } catch (writeErr) {
        Logger.debugLog("[TransactionRegistry] Logger.writeLog failed", {
          error:
            SafeUtils.sanitizeTextField(
              String(writeErr?.message || writeErr || ""),
            ) || "Unknown error",
          flag: "transaction",
          action: "deleteTransaction",
        });
      }
      return true;
    } catch (err) {
      Logger.debugLog("[TransactionRegistry] deleteTransaction raw error", {
        transaction_id: sanitizedTransactionId,
        error: String(err),
        stack: String(err?.stack || "").slice(0, this.STACK_MAX_LENGTH),
        code: SafeUtils.sanitizeTextField(String(err?.code || "")) || null,
      });
      const safeTransactionRef =
        SafeUtils.hasValue(sanitizedTransactionId) && sanitizedTransactionId
          ? sanitizedTransactionId
          : SafeUtils.sanitizeTextField(transaction_id);
      const errorString =
        SafeUtils.sanitizeTextField(
          String(err?.message || err || ""),
        ) || "Unknown error";
      const stackCandidate = SafeUtils.sanitizeTextField(err?.stack || "");
      const stack = stackCandidate
        ? stackCandidate.slice(0, this.STACK_MAX_LENGTH)
        : null;
      let contextString = "{}";
      try {
        contextString = JSON.stringify({ transaction_id: safeTransactionRef });
      } catch (err) {
        Logger.debugLog(
          "[TransactionRegistry] deleteTransaction error context stringify failed",
          { error: String(err) },
        );
        contextString = "{}";
      }
      const safeContext =
        SafeUtils.sanitizeTextField(
          contextString.slice(0, this.CONTEXT_MAX_LENGTH),
        ) || "{}";
      ErrorHandler.addError("Failed to delete transaction", {
        error: errorString,
        stack,
        context: safeContext,
      });
      try {
        await Logger.writeLog({
          flag: "transaction",
          action: "deleteTransaction",
          message: "Critical: Failed to delete transaction",
          data: { error: errorString, transaction_id: safeTransactionRef },
          critical: true,
        });
      } catch (writeErr) {
        Logger.debugLog("[TransactionRegistry] Logger.writeLog failed", {
          error:
            SafeUtils.sanitizeTextField(
              String(writeErr?.message || writeErr || ""),
            ) || "Unknown error",
          flag: "transaction",
          action: "deleteTransaction",
        });
      }
      Logger.debugLog("[TransactionRegistry] deleteTransaction() failed", {
        transaction_id: safeTransactionRef,
        error: errorString,
      });
      throw err;
    }
  }

  /** GET transaction by transaction_id */
  static async getTransaction(transaction_id) {
    let sanitizedTransactionId = null;
    try {
      ({
        transaction_id: sanitizedTransactionId,
      } = SafeUtils.sanitizeValidate({
        transaction_id: { value: transaction_id, type: "string", required: true },
      }));

      const db = this._getDbInstance();
      Logger.debugLog("[TransactionRegistry] getTransaction query attempt", {
        transaction_id: sanitizedTransactionId,
      });

      // Exclude soft-deleted transactions
      const result = await db.getRow(
        "default",
        `SELECT * FROM transactions 
       WHERE transaction_id = $1 
         AND is_deleted = false 
       LIMIT 1`,
        [sanitizedTransactionId]
      );

      const hasTransaction = result && SafeUtils.hasValue(result.transaction_id);
      Logger.debugLog("[TransactionRegistry] getTransaction query result", {
        transaction_id: sanitizedTransactionId,
        found: Boolean(hasTransaction),
        result_id: SafeUtils.sanitizeTextField(result?.transaction_id),
      });
      if (hasTransaction) {
        Logger.debugLog("[TransactionRegistry] getTransaction() success", {
          transaction_id: sanitizedTransactionId,
        });
      } else {
        Logger.debugLog("[TransactionRegistry] getTransaction() missing", {
          transaction_id: sanitizedTransactionId,
          status: "not found or soft-deleted",
        });
      }

      return result;
    } catch (err) {
      Logger.debugLog("[TransactionRegistry] getTransaction raw error", {
        transaction_id: sanitizedTransactionId,
        error: String(err),
        stack: String(err?.stack || "").slice(0, this.STACK_MAX_LENGTH),
        code: SafeUtils.sanitizeTextField(String(err?.code || "")) || null,
      });
      const safeTransactionRef =
        SafeUtils.hasValue(sanitizedTransactionId) && sanitizedTransactionId
          ? sanitizedTransactionId
          : SafeUtils.sanitizeTextField(transaction_id);
      const errorString =
        SafeUtils.sanitizeTextField(
          String(err?.message || err || ""),
        ) || "Unknown error";
      const stackCandidate = SafeUtils.sanitizeTextField(err?.stack || "");
      const stack = stackCandidate
        ? stackCandidate.slice(0, this.STACK_MAX_LENGTH)
        : null;
      let contextString = "{}";
      try {
        contextString = JSON.stringify({ transaction_id: safeTransactionRef });
      } catch (err) {
        Logger.debugLog(
          "[TransactionRegistry] getTransaction error context stringify failed",
          { error: String(err) },
        );
        contextString = "{}";
      }
      const safeContext =
        SafeUtils.sanitizeTextField(
          contextString.slice(0, this.CONTEXT_MAX_LENGTH),
        ) || "{}";
      ErrorHandler.addError("Failed to get transaction", {
        error: errorString,
        stack,
        context: safeContext,
      });
      try {
        await Logger.writeLog({
          flag: "transaction",
          action: "getTransaction",
          message: "Failed to get transaction",
          data: {
            error: errorString,
            transaction_id: safeTransactionRef,
          },
        });
      } catch (writeErr) {
        Logger.debugLog("[TransactionRegistry] Logger.writeLog failed", {
          error:
            SafeUtils.sanitizeTextField(
              String(writeErr?.message || writeErr || ""),
            ) || "Unknown error",
          flag: "transaction",
          action: "getTransaction",
        });
      }
      Logger.debugLog("[TransactionRegistry] getTransaction() failed", {
        transaction_id: safeTransactionRef,
        error: errorString,
      });
      throw err;
    }
  }

  /** QUERY transactions with a flexible filter set and pagination. */
  static async query(filters = {}, pagination = {}) {
    const normalizedFilters = SafeUtils.isPlainObject(filters)
      ? filters
      : {};
    const paginationOptions = this._resolvePaginationOptions(pagination);
    const safeLimit = paginationOptions.limit;
    const safeOffset = paginationOptions.offset;

    let safeDateStartInput = null;
    let safeDateEndInput = null;
    let startWindow = null;
    let endWindow = null;

    if (SafeUtils.hasValue(normalizedFilters.dateStart)) {
      safeDateStartInput = SafeUtils.sanitizeTextField(
        normalizedFilters.dateStart,
      );
      if (
        !DateTime.isValidDate(safeDateStartInput, "yyyy-MM-dd")
      ) {
        throw new Error("Invalid dateStart");
      }
      startWindow = DateTime.getStartOfDay(safeDateStartInput);
      if (startWindow === false)
        throw new Error("Invalid dateStart window");
    }
    if (SafeUtils.hasValue(normalizedFilters.dateEnd)) {
      safeDateEndInput = SafeUtils.sanitizeTextField(normalizedFilters.dateEnd);
      if (!DateTime.isValidDate(safeDateEndInput, "yyyy-MM-dd")) {
        throw new Error("Invalid dateEnd");
      }
      endWindow = DateTime.getEndOfDay(safeDateEndInput);
      if (endWindow === false) throw new Error("Invalid dateEnd window");
    }
    if (startWindow && endWindow) {
      const deltaSeconds = DateTime.diffInSeconds(startWindow, endWindow);
      if (deltaSeconds === false) throw new Error("Invalid date range");
      if (deltaSeconds < 0) throw new Error("dateStart must be <= dateEnd");
    }

    const transactionIdCandidate =
      normalizedFilters.transactionId ?? normalizedFilters.transaction_id;
    let sanitizedTransactionId = null;
      if (SafeUtils.hasValue(transactionIdCandidate)) {
        const sanitized = SafeUtils.sanitizeTextField(transactionIdCandidate);
        const normalized =
          typeof sanitized === "string" ? sanitized.trim() : sanitized;
        if (!SafeUtils.hasValue(normalized))
          throw new Error("query(): Missing transactionId");
        sanitizedTransactionId = normalized;
      }

    const customerCandidate =
      normalizedFilters.customer_uid ??
      normalizedFilters.customerUid ??
      normalizedFilters.customerId;
    let sanitizedCustomerId = null;
      if (SafeUtils.hasValue(customerCandidate)) {
        const sanitized = SafeUtils.sanitizeTextField(customerCandidate);
        const normalized =
          typeof sanitized === "string" ? sanitized.trim() : sanitized;
        if (!SafeUtils.hasValue(normalized))
          throw new Error("query(): Missing customerId");
        sanitizedCustomerId = normalized;
      }

    const orderTypeCandidate =
      normalizedFilters.order_type ?? normalizedFilters.orderType;
    const safeOrderType = (() => {
      if (!SafeUtils.hasValue(orderTypeCandidate)) return null;
      const sanitized = SafeUtils.sanitizeTextField(orderTypeCandidate);
      const normalized =
        typeof sanitized === "string" ? sanitized.trim() : sanitized;
      return SafeUtils.hasValue(normalized) ? normalized : null;
    })();

    const normalizedStatus = SafeUtils.hasValue(normalizedFilters.status)
      ? this._normalizeTransactionStatus(normalizedFilters.status)
      : null;

    const ownerCandidates = [];
    const ownerFields = [
      normalizedFilters.ownerId,
      normalizedFilters.owner_uuid,
      normalizedFilters.owner,
    ];
    for (const candidate of ownerFields) {
      if (SafeUtils.hasValue(candidate)) ownerCandidates.push(candidate);
    }
    if (Array.isArray(normalizedFilters.ownerIds)) {
      ownerCandidates.push(...normalizedFilters.ownerIds);
    }
    if (Array.isArray(normalizedFilters.owner_ids)) {
      ownerCandidates.push(...normalizedFilters.owner_ids);
    }

    const sanitizedOwnerIds = Array.from(
      new Set(
        ownerCandidates
          .map((owner) => SafeUtils.sanitizeTextField(owner))
          .filter(SafeUtils.hasValue)
          .map(String),
      ),
    );
    const hasOwners = sanitizedOwnerIds.length > 0;
    const logContext = {
      limit: safeLimit,
      offset: safeOffset,
      transactionId: sanitizedTransactionId,
      customerId: sanitizedCustomerId,
      ownerIds: hasOwners ? sanitizedOwnerIds : null,
      orderType: safeOrderType,
      status: normalizedStatus,
      dateStart: safeDateStartInput,
      dateEnd: safeDateEndInput,
    };

    try {
      const whereClauses = ["is_deleted = false"];
      const params = [];
      if (sanitizedTransactionId) {
        params.push(sanitizedTransactionId);
        whereClauses.push(`transaction_id = $${params.length}`);
      }
      if (sanitizedCustomerId) {
        params.push(sanitizedCustomerId);
        whereClauses.push(`customer_uid = $${params.length}`);
      }
      if (hasOwners) {
        let ownersParam = null;
        try {
          ownersParam = JSON.stringify(sanitizedOwnerIds);
        } catch (err) {
          Logger.debugLog("[TransactionRegistry] query owners filter stringify failed", {
            error: String(err),
            owner_count: sanitizedOwnerIds.length,
          });
          throw new Error("Invalid ownerIds filter");
        }
        params.push(ownersParam);
        whereClauses.push(`owners @> $${params.length}`);
      }
      if (SafeUtils.hasValue(safeOrderType)) {
        params.push(safeOrderType);
        whereClauses.push(`order_type = $${params.length}`);
      }
      if (normalizedStatus) {
        params.push(normalizedStatus);
        whereClauses.push(`status = $${params.length}`);
      }
      if (startWindow) {
        params.push(startWindow);
        whereClauses.push(`created_at >= $${params.length}`);
      }
      if (endWindow) {
        params.push(endWindow);
        whereClauses.push(`created_at <= $${params.length}`);
      }

      const baseParams = [...params];
      const countSql = this._composeCountSql(whereClauses);
      const countSqlSnippet = SafeUtils.sanitizeTextField(
        countSql.replace(/\s+/g, " ").trim().slice(0, 200),
      );
      const sanitizedBaseParams = baseParams
        .map((param) =>
          SafeUtils.sanitizeTextField(
            String(param === null || param === undefined ? "" : param),
          ),
        )
        .filter(SafeUtils.hasValue)
        .slice(0, 10);
      Logger.debugLog("[TransactionRegistry] query count sql", {
        count_sql: countSqlSnippet,
        filter_summary: {
          transaction_id: sanitizedTransactionId,
          customer_id: sanitizedCustomerId,
          owner_count: sanitizedOwnerIds.length,
          order_type: safeOrderType,
          status: normalizedStatus,
        },
        param_count: baseParams.length,
        params_preview: sanitizedBaseParams,
      });
      const db = this._getDbInstance();
      const countRow = await db.getRow("default", countSql, baseParams);
      const totalMatches = countRow ? parseInt(countRow.total, 10) || 0 : 0;
      Logger.debugLog("[TransactionRegistry] query count result", {
        total_matches: totalMatches,
      });

      const dataSql = this._composePaginatedSelectSql(
        whereClauses,
        baseParams.length,
      );
      const paginatedParams = [...baseParams, safeLimit, safeOffset];
      const sanitizedPaginatedParams = paginatedParams
        .map((param) =>
          SafeUtils.sanitizeTextField(
            String(param === null || param === undefined ? "" : param),
          ),
        )
        .filter(SafeUtils.hasValue)
        .slice(0, 12);
      const dataSqlSnippet = SafeUtils.sanitizeTextField(
        dataSql.replace(/\s+/g, " ").trim().slice(0, 200),
      );
      Logger.debugLog("[TransactionRegistry] query data sql", {
        data_sql: dataSqlSnippet,
        limit: safeLimit,
        offset: safeOffset,
        params_count: paginatedParams.length,
        params_preview: sanitizedPaginatedParams,
      });

      const result = await db.query("default", dataSql, paginatedParams);
      const rows = Array.isArray(result?.rows) ? result.rows : [];
      Logger.debugLog("[TransactionRegistry] query raw result", {
        rows: rows.length,
        rowCount: result?.rowCount ?? null,
        total_matches: totalMatches,
      });
      if (rows.length > 0) {
        Logger.debugLog("[TransactionRegistry] query() success", {
          rows: rows.length,
          total: totalMatches,
          limit: safeLimit,
          offset: safeOffset,
        });
      } else {
        Logger.debugLog("[TransactionRegistry] query transactions returned no rows", {
          ...logContext,
          limit: safeLimit,
        });
      }

      return { rows, total: totalMatches };
    } catch (err) {
      Logger.debugLog("[TransactionRegistry] query raw error", {
        error: String(err),
        stack: String(err?.stack || "").slice(0, this.STACK_MAX_LENGTH),
        code: SafeUtils.sanitizeTextField(String(err?.code || "")) || null,
      });
      const errorString =
        SafeUtils.sanitizeTextField(
          String(err?.message || err || ""),
        ) || "Unknown error";
      const stackCandidate = SafeUtils.sanitizeTextField(err?.stack || "");
      const stack = stackCandidate
        ? stackCandidate.slice(0, this.STACK_MAX_LENGTH)
        : null;
      let contextString = "{}";
      try {
        contextString = JSON.stringify(logContext || {});
      } catch (err) {
        Logger.debugLog("[TransactionRegistry] query error context stringify failed", {
          error: String(err),
        });
        contextString = "{}";
      }
      const safeContext =
        SafeUtils.sanitizeTextField(
          contextString.slice(0, this.CONTEXT_MAX_LENGTH),
        ) || "{}";
      ErrorHandler.addError("Failed to query transactions", {
        error: errorString,
        stack,
        context: safeContext,
      });
      try {
        await Logger.writeLog({
          flag: "transaction",
          action: "query",
          message: "Failed to query transactions",
          data: {
            error: errorString,
            ...logContext,
          },
        });
      } catch (writeErr) {
        Logger.debugLog("[TransactionRegistry] Logger.writeLog failed", {
          error:
            SafeUtils.sanitizeTextField(
              String(writeErr?.message || writeErr || ""),
            ) || "Unknown error",
          flag: "transaction",
          action: "query",
        });
      }
      Logger.debugLog("[TransactionRegistry] query() failed", {
        error: errorString,
        ...logContext,
      });
      return { rows: [], total: 0 };
    }
  }

  /** GET ALL count of transactions */
  static async getAllCount() {
    try {
      const whereClauses = ["is_deleted = false"];
      const sql = this._composeCountSql(whereClauses);
      const sqlSnippet = SafeUtils.sanitizeTextField(
        sql.replace(/\s+/g, " ").trim().slice(0, 200),
      );
      Logger.debugLog("[TransactionRegistry] getAllCount query", {
        sql: sqlSnippet,
        params: [],
      });
      const db = this._getDbInstance();
      const result = await db.getRow("default", sql, []);

      const count = result ? parseInt(result.total) : 0;
      Logger.debugLog("[TransactionRegistry] getAllCount() success", {
        count,
      });
      return count;
    } catch (err) {
      Logger.debugLog("[TransactionRegistry] getAllCount raw error", {
        error: String(err),
        stack: String(err?.stack || "").slice(0, this.STACK_MAX_LENGTH),
        code: SafeUtils.sanitizeTextField(String(err?.code || "")) || null,
      });
      const errorString =
        SafeUtils.sanitizeTextField(
          String(err?.message || err || ""),
        ) || "Unknown error";
      const stackCandidate = SafeUtils.sanitizeTextField(err?.stack || "");
      const stack = stackCandidate
        ? stackCandidate.slice(0, this.STACK_MAX_LENGTH)
        : null;
      let contextString = "{}";
      try {
        contextString = JSON.stringify({ operation: "getAllCount" });
      } catch (err) {
        Logger.debugLog("[TransactionRegistry] getAllCount error context stringify failed", {
          error: String(err),
        });
        contextString = "{}";
      }
      const safeContext =
        SafeUtils.sanitizeTextField(
          contextString.slice(0, this.CONTEXT_MAX_LENGTH),
        ) || "{}";
      ErrorHandler.addError("Failed to get all transactions count", {
        error: errorString,
        stack,
        context: safeContext,
      });
      Logger.debugLog("[TransactionRegistry] getAllCount() failed", {
        error: errorString,
      });
      return 0;
    }
  }

  /** GET ALL count of transactions by status */
  static async getAllCountByStatus(status) {
    let normalizedStatus = null;
    try {
      normalizedStatus = this._normalizeTransactionStatus(status);

      const whereClauses = ["status = $1", "is_deleted = false"];
      const sql = this._composeCountSql(whereClauses);
      const params = [normalizedStatus];
      const sqlSnippet = SafeUtils.sanitizeTextField(
        sql.replace(/\s+/g, " ").trim().slice(0, 200),
      );
      const logContext = { status: normalizedStatus };
      Logger.debugLog("[TransactionRegistry] getAllCountByStatus query", {
        sql: sqlSnippet,
        params: params.map((param) => SafeUtils.sanitizeTextField(String(param))),
        ...logContext,
      });
      const db = this._getDbInstance();
      const result = await db.getRow("default", sql, params);

      const count = result ? parseInt(result.total) : 0;
      Logger.debugLog("[TransactionRegistry] getAllCountByStatus() success", {
        status: normalizedStatus,
        count,
      });
      return count;
    } catch (err) {
      Logger.debugLog("[TransactionRegistry] getAllCountByStatus raw error", {
        status: normalizedStatus,
        error: String(err),
        stack: String(err?.stack || "").slice(0, this.STACK_MAX_LENGTH),
        code: SafeUtils.sanitizeTextField(String(err?.code || "")) || null,
      });
      const errorString =
        SafeUtils.sanitizeTextField(
          String(err?.message || err || ""),
        ) || "Unknown error";
      const stackCandidate = SafeUtils.sanitizeTextField(err?.stack || "");
      const stack = stackCandidate
        ? stackCandidate.slice(0, this.STACK_MAX_LENGTH)
        : null;
      let contextString = "{}";
      try {
        contextString = JSON.stringify({
          status: normalizedStatus || status,
        });
      } catch (err) {
        Logger.debugLog(
          "[TransactionRegistry] getAllCountByStatus error context stringify failed",
          { error: String(err) },
        );
        contextString = "{}";
      }
      const safeContext =
        SafeUtils.sanitizeTextField(
          contextString.slice(0, this.CONTEXT_MAX_LENGTH),
        ) || "{}";
      ErrorHandler.addError("Failed to get transactions count by status", {
        error: errorString,
        stack,
        context: safeContext,
      });
      Logger.debugLog("[TransactionRegistry] getAllCountByStatus() failed", {
        status: normalizedStatus || status,
        error: errorString,
      });
      return 0;
    }
  }

  /** Close all database connections (for cleanup) */
  static async closeConnections() {
    if (!this._db) return;
    try {
      await this._db.closeAllConnections();
      Logger.debugLog("[TransactionRegistry] closeConnections() success", {
        status: "closed",
      });
    } catch (err) {
      Logger.debugLog("[TransactionRegistry] closeConnections() failed", {
        error: SafeUtils.sanitizeTextField(String(err?.message)),
      });
    } finally {
      this._db = null;
    }
  }

  static _getDbInstance() {
    if (this._db) return this._db;

    this._db = new PostgreSQL({
      queryLogger: ({ name, text, durationMs, error }) => {
        const normalizedText =
          typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
        const queryHash =
          normalizedText.length > 0
            ? crypto
                .createHash("sha256")
                .update(normalizedText)
                .digest("hex")
                .slice(0, 12)
            : null;
        Logger.debugLog("[TransactionRegistry DB] query", {
          name,
          durationMs,
          ok: !error,
          queryHash,
          queryLength: normalizedText.length,
        });
      },
      defaultQueryTimeoutMs: 15000,
    });

    return this._db;
  }

  static _createTransactionSanitizeInput(txn) {
    const cleaned = SafeUtils.sanitizeValidate({
      order_id: { value: txn?.order_id, type: "string", required: true },
      amount: { value: txn?.amount, type: "float", required: true },
      order_type: { value: txn?.order_type, type: "string", required: true },
      customer_uid: { value: txn?.customer_uid, type: "string", required: true },
      status: { value: txn?.status, type: "string", required: true },
      direction: {
        value:
          txn?.direction ?? txn?.transaction_kind ?? txn?.transactionKind ?? null,
        type: "string",
        required: true,
      },
      payment_method: { value: txn?.payment_method, type: "string", required: true },
      currency: { value: txn?.currency, type: "string", required: true },
      platform: { value: txn?.platform, type: "string", required: true },
      ip_address: { value: txn?.ip_address, type: "string", required: false },
      parent_transaction_id: {
        value: txn?.parent_transaction_id,
        type: "string",
        required: false,
      },
      meta: { value: txn?.meta, type: "object", required: false },
      user_agent: { value: txn?.user_agent, type: "string", required: false },
      refund_amount: { value: txn?.refund_amount, type: "float", required: false },
      refund_reason: { value: txn?.refund_reason, type: "string", required: false },
      dispute_id: { value: txn?.dispute_id, type: "string", required: false },
      write_status: {
        value: txn?.write_status,
        type: "string",
        required: false,
        default: "confirmed",
      },
      owners: { value: txn?.owners, type: "array", required: true },
      owner_allocations: { value: txn?.owner_allocations, type: "array", required: true },
      products: { value: txn?.products, type: "array", required: true },
    });

    const requiredTextFields = [
      "order_id",
      "order_type",
      "customer_uid",
      "status",
      "direction",
      "payment_method",
      "currency",
      "platform",
    ];
    for (const field of requiredTextFields) {
      if (!SafeUtils.hasValue(cleaned[field])) {
        throw new TypeError(`createTransaction(): "${field}" is required`);
      }
    }

    return cleaned;
  }

  static _createTransactionEnsureSerializableWithLimit(
    value,
    label,
    maxLength = null,
  ) {
    if (value === undefined) return undefined;
    try {
      const serialized = JSON.stringify(value);
      if (maxLength !== null && serialized.length > maxLength) {
        throw new TypeError(
          `${label} exceeds maximum length of ${maxLength} characters`,
        );
      }
      return value;
    } catch (err) {
      Logger.debugLog(
        "[TransactionRegistry] createTransaction serialization check failed",
        {
          label,
          error: String(err),
        },
      );
      throw new TypeError(`${label} must be serializable`);
    }
  }

  static _createTransactionSanitizeMeta(metaInput) {
    if (!SafeUtils.hasValue(metaInput)) return null;
    const sanitizedObject = SafeUtils.sanitizeObject(metaInput);
    if (!sanitizedObject) return null;
    return this._createTransactionSanitizeMetaEntries(sanitizedObject, "meta");
  }

  static _createTransactionSanitizeMetaEntries(metaObject, path) {
    const result = {};
    for (const [rawKey, rawValue] of Object.entries(metaObject)) {
      const key = SafeUtils.sanitizeTextField(rawKey);
      if (!SafeUtils.hasValue(key)) continue;

      if (!this.META_KEY_PATTERN.test(key)) {
        throw new TypeError(
          `${path}.${key} must match pattern ${this.META_KEY_PATTERN}`,
        );
      }

      const sanitizedValue = this._createTransactionSanitizeMetaValue(
        rawValue,
        `${path}.${key}`,
      );
      if (sanitizedValue === undefined) continue;
      result[key] = sanitizedValue;
    }

    return Object.keys(result).length ? result : null;
  }

  static _createTransactionSanitizeMetaValue(rawValue, path) {
    if (rawValue === undefined) return undefined;

    if (
      typeof rawValue === "string" ||
      typeof rawValue === "number" ||
      typeof rawValue === "boolean"
    ) {
      return rawValue;
    }

    if (Array.isArray(rawValue)) {
      return rawValue
        .map((entry, index) =>
          this._createTransactionSanitizeMetaValue(entry, `${path}[${index}]`),
        )
        .filter((entry) => entry !== undefined);
    }

    if (SafeUtils.isPlainObject(rawValue)) {
      const nested = SafeUtils.sanitizeObject(rawValue);
      if (!nested) return null;
      return this._createTransactionSanitizeMetaEntries(nested, path);
    }

    if (rawValue === null) return null;

    const sanitizedString = SafeUtils.sanitizeTextField(String(rawValue));
    return sanitizedString === null ? null : sanitizedString;
  }

  static _createTransactionSanitizeOwnerAllocations(ownerAllocations) {
    if (!Array.isArray(ownerAllocations)) {
      throw new TypeError("createTransaction(): owner_allocations must be an array");
    }

    return ownerAllocations.map((allocation, index) => {
      if (!SafeUtils.isPlainObject(allocation)) {
        throw new TypeError(
          `createTransaction(): owner_allocations[${index}] must be an object`,
        );
      }
      const ownerUuid = SafeUtils.sanitizeTextField(allocation.owner_uuid);
      const amountCents = SafeUtils.sanitizeInteger(allocation.amount_cents);
      if (!SafeUtils.hasValue(ownerUuid) || amountCents === null) {
        throw new TypeError(
          `createTransaction(): owner_allocations[${index}] must include owner_uuid and amount_cents`,
        );
      }
      return { owner_uuid: ownerUuid, amount_cents: amountCents };
    });
  }

  static _createTransactionNormalizeDirection(directionValue) {
    const sanitizedDirection = SafeUtils.sanitizeTextField(directionValue);
    if (!SafeUtils.hasValue(sanitizedDirection)) {
      throw new TypeError("createTransaction(): Missing direction");
    }
    const normalized = sanitizedDirection.trim().toLowerCase();
    if (!this.TRANSACTION_DIRECTIONS.includes(normalized)) {
      throw new TypeError(
        `createTransaction(): invalid direction (expected one of ${this.TRANSACTION_DIRECTIONS.join(
          ", ",
        )})`,
      );
    }
    return normalized;
  }

  static _createTransactionNormalizeStatus(statusValue) {
    const sanitizedStatus = SafeUtils.sanitizeTextField(statusValue);
    if (!SafeUtils.hasValue(sanitizedStatus)) {
      throw new TypeError("createTransaction(): Missing status");
    }
    return sanitizedStatus.trim().toLowerCase();
  }

  static _resolvePaginationOptions(pagination = {}) {
    Logger.debugLog("[TransactionRegistry] resolvePaginationOptions start", {
      raw_input: SafeUtils.sanitizeObject(pagination),
    });
    const options = SafeUtils.isPlainObject(pagination) ? pagination : {};
    const limitCandidate = SafeUtils.sanitizeInteger(options.limit);
    const offsetCandidate = SafeUtils.sanitizeInteger(options.offset);
    const limit =
      limitCandidate === null
        ? this.DEFAULT_LIMIT
        : Math.max(this.MIN_LIMIT, Math.min(this.MAX_LIMIT, limitCandidate));
    const offset =
      offsetCandidate === null
        ? this.DEFAULT_OFFSET
        : Math.max(this.DEFAULT_OFFSET, offsetCandidate);
    Logger.debugLog("[TransactionRegistry] resolvePaginationOptions", {
      raw_limit: options.limit,
      raw_offset: options.offset,
      effective_limit: limit,
      effective_offset: offset,
    });
    return { limit, offset };
  }

  static _normalizeTransactionStatus(statusValue) {
    Logger.debugLog("[TransactionRegistry] _normalizeTransactionStatus start", {
      raw_value: SafeUtils.sanitizeTextField(
        String(statusValue === undefined ? "" : statusValue),
      ),
    });
    const sanitizedStatus = SafeUtils.sanitizeTextField(statusValue);
    if (!SafeUtils.hasValue(sanitizedStatus)) {
      throw new TypeError("_normalizeTransactionStatus(): Missing status");
    }
    const normalizedStatus = sanitizedStatus.trim().toLowerCase();
    Logger.debugLog("[TransactionRegistry] _normalizeTransactionStatus result", {
      normalized: normalizedStatus,
    });
    return normalizedStatus;
  }

  static _compileWhereConditions(whereClauses) {
    Logger.debugLog("[TransactionRegistry] _compileWhereConditions start", {
      provided_clause_count: Array.isArray(whereClauses)
        ? whereClauses.length
        : 0,
    });
    if (!Array.isArray(whereClauses) || whereClauses.length === 0) {
      throw new Error("Paginated queries require at least one WHERE clause");
    }

    const normalizedClauses = [];
    for (let i = 0; i < whereClauses.length; i += 1) {
      const clause = whereClauses[i];
      if (typeof clause !== "string") {
        Logger.debugLog("[TransactionRegistry] _compileWhereConditions invalid", {
          index: i,
          type: typeof clause,
        });
        throw new TypeError(
          `_compileWhereConditions(): whereClauses[${i}] must be a string`,
        );
      }
      const trimmed = clause.trim();
      if (!trimmed) {
        Logger.debugLog("[TransactionRegistry] _compileWhereConditions empty", {
          index: i,
        });
        throw new TypeError(
          `_compileWhereConditions(): whereClauses[${i}] must not be empty`,
        );
      }

      const forbiddenMarkers = [";", "--", "/*", "*/"];
      for (const marker of forbiddenMarkers) {
        if (trimmed.includes(marker)) {
          Logger.debugLog("[TransactionRegistry] _compileWhereConditions rejected", {
            index: i,
            marker,
          });
          throw new TypeError(
            `_compileWhereConditions(): whereClauses[${i}] contains forbidden marker "${marker}"`,
          );
        }
      }

      const allowedClausePatterns = [
        /^is_deleted = false$/,
        /^transaction_id = \$\d+$/,
        /^customer_uid = \$\d+$/,
        /^owners @> \$\d+$/,
        /^order_type = \$\d+$/,
        /^status = \$\d+$/,
        /^created_at >= \$\d+$/,
        /^created_at <= \$\d+$/,
      ];
      const isAllowed = allowedClausePatterns.some((rx) => rx.test(trimmed));
      if (!isAllowed) {
        Logger.debugLog("[TransactionRegistry] _compileWhereConditions rejected", {
          index: i,
          clause: SafeUtils.sanitizeTextField(trimmed.slice(0, 200)),
        });
        throw new TypeError(
          `_compileWhereConditions(): whereClauses[${i}] is not an allowed clause`,
        );
      }

      normalizedClauses.push(trimmed);
    }
    if (normalizedClauses.length === 0) {
      throw new Error("Paginated queries require valid WHERE clauses");
    }
    Logger.debugLog("[TransactionRegistry] _compileWhereConditions normalized", {
      normalized_count: normalizedClauses.length,
      sample_clauses: normalizedClauses.slice(0, 3),
    });
    return normalizedClauses.join("\n          AND ");
  }

  static _composePaginatedSelectSql(whereClauses, existingParamCount) {
    Logger.debugLog("[TransactionRegistry] composePaginatedSelectSql start", {
      where_clause_count: Array.isArray(whereClauses) ? whereClauses.length : 0,
      existing_params: existingParamCount,
    });
    if (
      typeof existingParamCount !== "number" ||
      !Number.isInteger(existingParamCount) ||
      existingParamCount < 0
    ) {
      throw new TypeError(
        "composePaginatedSelectSql(): existingParamCount must be a non-negative integer",
      );
    }
    const whereSql = this._compileWhereConditions(whereClauses);
    const limitIndex = existingParamCount + 1;
    const offsetIndex = existingParamCount + 2;
    const normalizedWhereSql =
      SafeUtils.sanitizeTextField(whereSql.replace(/\s+/g, " ").trim()) || "";
    Logger.debugLog("[TransactionRegistry] composePaginatedSelectSql built", {
      where_sql: normalizedWhereSql,
      limit_index: limitIndex,
      offset_index: offsetIndex,
    });
    return `
        SELECT *
        FROM transactions
        WHERE ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${limitIndex} OFFSET $${offsetIndex};
      `;
  }

  static _composeCountSql(whereClauses) {
    Logger.debugLog("[TransactionRegistry] composeCountSql start", {
      where_clause_count: Array.isArray(whereClauses) ? whereClauses.length : 0,
    });
    const whereSql = this._compileWhereConditions(whereClauses);
    const normalizedWhereSql =
      SafeUtils.sanitizeTextField(whereSql.replace(/\s+/g, " ").trim()) || "";
    Logger.debugLog("[TransactionRegistry] composeCountSql built", {
      where_sql: normalizedWhereSql,
    });
    return `
        SELECT COUNT(*) as total
        FROM transactions
        WHERE ${whereSql};
      `;
  }

}
