const asyncRedis = require('async-redis');
const logError = require('../clients/loggerClient').logError;
const env = require('../environment/environment').env();
const dbPrefix = env.DB_PREFIX

let client = false;

const init_redis = async () => {
    client = asyncRedis.createClient(env.REDIS_PORT, env.REDIS_HOST);
    await client.auth(env.REDIS_PASSWORD);
    client.on("error", err => {
        logError(err);
    });
}

const set = async (key, value, expirationInSeconds = 86400) => { // 24 Hours
    const dbKey = `${dbPrefix}:${key}`
    if (!client) {
        await init_redis();
    }
    await client.set(dbKey, JSON.stringify(value), 'EX', expirationInSeconds);
}

const get = async (key) => {
    const dbKey = `${dbPrefix}:${key}`
    if (!client) {
        await init_redis();
    }
    try {
        value = await client.get(dbKey);
        return(JSON.parse(value))
    } catch (error) {
        logError(`Failed getting key from redis: ${dbKey}`);
        logError(error);
        return null;
    }
}

const close = async () => {
    await client.quit();
}

module.exports = {
    get: get,
    set: set,
    close: close,
}