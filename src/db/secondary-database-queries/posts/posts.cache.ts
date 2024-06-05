import redis from '../../redis';

export const insertPostCache = async <T extends string>(keyFor : string, id : string, value : T, expireTime : number) => {
    await redis.hset(`${keyFor}:${id}`, value);
    await redis.expire(`${keyFor}:${id}`, expireTime);
}

export const increaseViews = async (postId : string) : Promise<string> => {
    const requestCountKey = `posts:requests`;
    await redis.zincrby(requestCountKey, 1, postId);
    const requestCount = await redis.zscore(requestCountKey, postId);
    return requestCount as string;
}