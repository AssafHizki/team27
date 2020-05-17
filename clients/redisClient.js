const asyncRedis = require('async-redis');
const env = require('../environment/environment').env();

let client = false;

const init_redis = async () => {
    client = asyncRedis.createClient(env.REDIS_PORT, env.REDIS_HOST);
    await client.auth(env.REDIS_PASSWORD);
    client.on("error", err => {
        console.error(err);
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
        console.error(`Failed getting key from redis: ${key}`);
        console.error(error);
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