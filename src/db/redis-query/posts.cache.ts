import redis from '../redis';

export const increaseViews = async (postId : string) : Promise<string> => {
    const requestCountKey = `posts:requests`;
    await redis.zincrby(requestCountKey, 1, postId);
    const requestCount = await redis.zscore(requestCountKey, postId);
    return requestCount as string;
}