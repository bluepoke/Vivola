export class InvalidInputError extends Error {}
export class NotFoundError extends Error {}
// Shared between session-service and answer-service (rather than defined in
// one and imported by the other) since both need to reject their commands
// once a Session has ended, and neither module should import the other.
export class SessionEndedError extends Error {}
