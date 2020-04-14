import * as E from '../Errors';

export const E_INVALID_LEADING_PACKET = E.ErrorHub.define(
    null,
    'E_INVALID_LEADING_PACKET',
    'A leading packet must be at least 4 bytes.',
    {}
);
