/**
 * Mock ErrorHandler implementation for testing
 */

class ErrorHandlerMock {
  constructor() {
    this.errors = [];
  }

  addError(message, details) {
    this.errors.push({ message, details });
  }

  reset() {
    this.errors = [];
  }

  getErrors() {
    return this.errors;
  }

  hasError(messageSubstring) {
    return this.errors.some(e => e.message.includes(messageSubstring));
  }
}

module.exports = new ErrorHandlerMock();
