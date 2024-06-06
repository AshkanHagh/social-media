import redis from '../redis';

export const insertIntoCache = async <T extends string>(keyFor : string, id : string, value : T, expireTime : number) => {
    await redis.hset(`${keyFor}:${id}`, value);
    await redis.expire(`${keyFor}:${id}`, expireTime);
}

export const findInCache = async (keyFor : string, id : string) => {
    return await redis.hgetall(`${keyFor}:${id}`);
    
}

export const delCache = async (keyFor : string, id : string) => {
    return await redis.hdel(`${keyFor}:${id}`);
}