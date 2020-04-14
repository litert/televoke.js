import * as L from '@litert/core';

export const ErrorHub = L.createErrorHub('@litert/televoke');

export const E_PACKET_TOO_LARGE = ErrorHub.define(
    null,
    'E_PACKET_TOO_LARGE',
    'The packet is larger than the maximum size of packet.',
    {}
);

export const E_INVALID_PACKET = ErrorHub.define(
    null,
    'E_INVALID_PACKET',
    'The packet is invalid.',
    {}
);
