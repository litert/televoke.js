import { ErrorHub } from '../Errors';

export const E_GATEWAY_STARTING = ErrorHub.define(
    null,
    'E_GATEWAY_STARTING',
    'A gateway has already been starting.',
    {}
);

export const E_GATEWAY_CLOSING = ErrorHub.define(
    null,
    'E_GATEWAY_CLOSING',
    'A gateway has already been closing.',
    {}
);

export const E_SERVER_STARTING = ErrorHub.define(
    null,
    'E_SERVER_STARTING',
    'A server has already been starting.',
    {}
);

export const E_SERVER_CLOSING = ErrorHub.define(
    null,
    'E_SERVER_CLOSING',
    'A server has already been closing.',
    {}
);

export const E_SERVER_BUSY = ErrorHub.define(
    null,
    'E_SERVER_BUSY',
    'It is not able to update server currnetly.',
    {}
);

export const E_NO_SERVER_ATTACHED = ErrorHub.define(
    null,
    'E_NO_SERVER_ATTACHED',
    'The gateway does not attach to a server.',
    {}
);

export const E_SERVER_NOT_READY = ErrorHub.define(
    null,
    'E_SERVER_NOT_READY',
    'The server is not setup completely.',
    {}
);

export const E_GATEWAY_BUSY = ErrorHub.define(
    null,
    'E_GATEWAY_BUSY',
    'The gateway has been attached to a server.',
    {}
);
