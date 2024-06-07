import redis from '../redis';

export const insertIntoCache = async <T extends unknown>(keyFor : string, id : string, value : T, expireTime : number) => {
    await redis.hset(`${keyFor}:${id}`, value!);
    await redis.expire(`${keyFor}:${id}`, expireTime);
}

export const findInCache = async <T>(key : string) => {
    const data =  await redis.hgetall(key);
    return data as T;
}

export const delCache = async (keyFor : string, id : string) => {
    return await redis.hdel(`${keyFor}:${id}`);
}

export const setExpiresTime = async (key : string, expiresTime : number) => {
    return await redis.expire(key, expiresTime);
}