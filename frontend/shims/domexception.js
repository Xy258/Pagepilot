export default class DomException extends Error {
  constructor(message) {
    super(message);
    this.name = 'DOMException';
  }
}
