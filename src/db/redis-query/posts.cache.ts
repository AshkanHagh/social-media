import { findInCache } from '.';
import type { TInferSelectPost } from '../../@types';
import redis from '../redis';

export const increaseViews = async (postId : string) : Promise<string> => {
    const requestCountKey = `posts:requests`;
    await redis.zincrby(requestCountKey, 1, postId);
    const requestCount = await redis.zscore(requestCountKey, postId);
    return requestCount as string;
}

export const findFollowersPostInCache = async (followerId : string) => {
    let cursor = '0';
    let matchedPosts: TInferSelectPost[] = [];

    do {
        const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'post:*', 'COUNT', 100);

        for (const key of keys) {
            const keyType = await redis.type(key);
            if (keyType === 'hash') {
                const postKey: TInferSelectPost = await findInCache<TInferSelectPost>(key);
                if (postKey.authorId === followerId) {matchedPosts.push(postKey)}
            }
        }

    cursor = newCursor;
    } while (cursor !== '0');

    return matchedPosts;
}