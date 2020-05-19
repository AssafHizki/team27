const asyncRedis = require('async-redis');
const log = require('./loggerClient').log;
const env = require('../environment/environment').env();

let client = false;

const init_redis = async () => {
    client = asyncRedis.createClient(env.REDIS_PORT, env.REDIS_HOST);
    await client.auth(env.REDIS_PASSWORD);
    client.on("error", err => {
        log(err, level='ERROR');
    });
}

const set = async (key, value) => {
    if (!client) {
        await init_redis();
    }
    await client.set(key, JSON.stringify(value));
}

const get = async (key) => {
    if (!client) {
        await init_redis();
    }
    try {
        value = await client.get(key);
        return(JSON.parse(value))
    } catch (error) {
        log(`Failed getting key from redis: ${key}`, level='ERROR');
        log(error, level='ERROR');
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