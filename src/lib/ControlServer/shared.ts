import jsonPatch from 'fast-json-patch';
const { randomPhrase } = require('@mojaloop/sdk-standard-components');


/**************************************************************************
 * The message protocol messages, verbs, and errors
 *************************************************************************/
const MESSAGE = {
    CONFIGURATION: 'CONFIGURATION',
    PEER_JWS: 'PEER_JWS',
    ERROR: 'ERROR',
};

const VERB = {
    READ: 'READ',
    NOTIFY: 'NOTIFY',
    PATCH: 'PATCH',
};

const ERROR = {
    UNSUPPORTED_MESSAGE: 'UNSUPPORTED_MESSAGE',
    UNSUPPORTED_VERB: 'UNSUPPORTED_VERB',
    JSON_PARSE_ERROR: 'JSON_PARSE_ERROR',
};

/**************************************************************************
 * Private convenience functions
 *************************************************************************/
const serialise = JSON.stringify;
const deserialise = (msg: any) => {
    //reviver function
    return JSON.parse(msg.toString(), (k, v) => {
        if (
            v !== null &&
            typeof v === 'object' &&
            'type' in v &&
            v.type === 'Buffer' &&
            'data' in v &&
            Array.isArray(v.data)
        ) {
            return Buffer.from(v.data);
        }
        return v;
    });
};

const buildMsg = (verb, msg, data, id = randomPhrase()) =>
    serialise({
        verb,
        msg,
        data,
        id,
    });

const buildPatchConfiguration = (oldConf, newConf, id) => {
    const patches = jsonPatch.compare(oldConf, newConf);
    return buildMsg(VERB.PATCH, MESSAGE.CONFIGURATION, patches, id);
};

const getWsIp = (req) => [
    req.socket.remoteAddress,
    ...(req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(/\s*,\s*/) : []),
];

/**************************************************************************
 * build
 *
 * Public object exposing an API to build valid protocol messages.
 * It is not the only way to build valid messages within the protocol.
 *************************************************************************/
const build = {
    CONFIGURATION: {
        PATCH: buildPatchConfiguration,
        READ: (id?: string) => buildMsg(VERB.READ, MESSAGE.CONFIGURATION, {}, id),
        NOTIFY: (config, id?: string) => buildMsg(VERB.NOTIFY, MESSAGE.CONFIGURATION, config, id),
    },
    PEER_JWS: {
        READ: (id?: string) => buildMsg(VERB.READ, MESSAGE.PEER_JWS, {}, id),
        NOTIFY: (peerJWS, id?: string) => buildMsg(VERB.NOTIFY, MESSAGE.PEER_JWS, peerJWS, id),
    },
    ERROR: {
        NOTIFY: {
            UNSUPPORTED_MESSAGE: (id) => buildMsg(VERB.NOTIFY, MESSAGE.ERROR, ERROR.UNSUPPORTED_MESSAGE, id),
            UNSUPPORTED_VERB: (id) => buildMsg(VERB.NOTIFY, MESSAGE.ERROR, ERROR.UNSUPPORTED_VERB, id),
            JSON_PARSE_ERROR: (id?: string) => buildMsg(VERB.NOTIFY, MESSAGE.ERROR, ERROR.JSON_PARSE_ERROR, id),
        },
    },
};

export {
    MESSAGE,
    VERB,
    ERROR,
    serialise,
    deserialise,
    buildMsg,
    buildPatchConfiguration,
    build,
    getWsIp,
}