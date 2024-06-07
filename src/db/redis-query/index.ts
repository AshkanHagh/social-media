import redis from '../redis';

export const insertIntoCache = async <T extends unknown>(keyFor : string, id : string, value : T, expireTime : number) => {
    await redis.hset(`${keyFor}:${id}`, value!);
    await redis.expire(`${keyFor}:${id}`, expireTime);
}

export const findInCache = async <T>(key : string) => {
    const data =  await redis.hgetall(key);
    return data as T;
}

export const findInCacheList = async <T>(key : string) => {
    const data = await redis.lrange(key, 0, -1);
    return data as T;
}

export const deleteCacheField = async (key : string, field : string) => {
    return await redis.hdel(key, field);
}

export const deleteInCacheList = async (key : string, field : string) => {
    return await redis.lrem(key, 0, field);
}

export const deleteCache = async (key : string) => {
    await redis.del(key);
}

export const setExpiresTime = async (key : string, expiresTime : number) => {
    return await redis.expire(key, expiresTime);
}