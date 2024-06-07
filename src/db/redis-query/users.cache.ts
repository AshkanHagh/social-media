import { deleteCacheField } from '.';
import type { TFollowerProfileInfo, TInferSelectUser, TInferSelectUserWithoutPassword } from '../../@types';
import redis from '../redis';

export const newFollowerCache = async (followedId : string, followerId : string, follows : TFollowerProfileInfo) => {
    await redis.hset(`followers:${followedId}`, followerId, JSON.stringify(follows));
}

export const delFollowerCache = async (followedId : string, followerId : string) => {
    // await redis.hdel(`followers:${followedId}`, followerId);
    await deleteCacheField(`followers:${followedId}`, followerId);
}

export const addNewFollowersInCache = async (redisKey : string, ...followerEntries : string[]) => {
    await redis.hmset(redisKey, ...followerEntries);
}

export const updateFollowerInfoCache = async (user : TInferSelectUserWithoutPassword) => {
    let cursor = '0';
    do {
        const [newCursor, keys] = await redis.scan(cursor, 'MATCH', `followers:*`, 'COUNT', 100);
        
        for(const key of keys) {
            const followers = await redis.hgetall(key);
            const pipeline = redis.pipeline();
            
            for (const followerId in followers) {
                const follower = JSON.parse(followers[followerId]);
                if (follower.id === user.id) {
                    follower.username = user.username;
                    pipeline.hset(key, followerId, JSON.stringify(follower));
                }
            }
            await pipeline.exec();
        }
        cursor = newCursor;
    } while (cursor !== '0');
}

export const searchUserFromCache = async (query : string) => {
    const regexp = new RegExp(query, 'i');
    let cursor = '0';
    const matchedUsers : TInferSelectUser[] = [];

    do {
        const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'user:*', 'COUNT', 100);
        for (const key of keys) {
            const userRaw = await redis.hgetall(key);
            const user = userRaw as unknown as TInferSelectUser
            if(regexp.test(user.username)) {
                matchedUsers.push(user);
            }
        }
        cursor = newCursor;
    } while (cursor !== '0');

    return matchedUsers;
}