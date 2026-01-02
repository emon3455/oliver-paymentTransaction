/**
 * Mock Logger implementation for testing
 */

class LoggerMock {
  constructor() {
    this.logs = [];
    this.debugLogs = [];
    this.shouldThrowOnWriteLog = false;
    this.shouldThrowOnDebugLog = false;
  }

  async writeLog(logData) {
    if (this.shouldThrowOnWriteLog) {
      throw new Error('Logger.writeLog mock error');
    }
    this.logs.push(logData);
  }

  debugLog(message, data) {
    if (this.shouldThrowOnDebugLog) {
      throw new Error('Logger.debugLog mock error');
    }
    this.debugLogs.push({ message, data });
  }

  reset() {
    this.logs = [];
    this.debugLogs = [];
    this.shouldThrowOnWriteLog = false;
    this.shouldThrowOnDebugLog = false;
  }

  setWriteLogShouldThrow(value) {
    this.shouldThrowOnWriteLog = value;
  }

  setDebugLogShouldThrow(value) {
    this.shouldThrowOnDebugLog = value;
  }

  getLogs() {
    return this.logs;
  }

  getDebugLogs() {
    return this.debugLogs;
  }
}

module.exports = new LoggerMock();
