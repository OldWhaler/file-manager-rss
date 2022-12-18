import { Messages } from './Messages.js'

export class OperationError extends Error {
  constructor() {
    super()
    this.message = Messages.UNKNOWN_OPERATION_MSG;
    this.name = 'OperationError';
  }
}

