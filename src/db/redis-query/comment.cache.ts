import { deleteCache, findInCacheList, setExpiresTime } from '.';
import type { TInferSelectComment, TInferSelectReplies } from '../../@types';
import redis from '../redis';

export const insertCommentToCache = async (postId : string, comment : TInferSelectComment) : Promise<void> => {
    const commentId = `comment:${comment.id}`;
    await Promise.all([redis.rpush(`post:${postId}:comments`, commentId), redis.hmset(commentId, comment)]);
    await Promise.all([setExpiresTime(commentId, 1209600), setExpiresTime(`post:${postId}:comments`, 1209600)]);
}

export const findCommentsIdInCache = async (postId : string, limit : number, offset : number) : Promise<string[]> => {
    return await redis.lrange(`post:${postId}:comments`, offset, offset + limit -1);
};

export const findRequestedKeyInCacheList = async (firstKey : string, lastKey : string, commentId : string, condition : 'include' | 'search') => {
    let cursor = '0';
    let result = [];
    do {
        const [newCursor, keys] = await redis.scan(cursor, 'MATCH', `${firstKey}:*:${lastKey}`, 'COUNT', 100);
        for (const key of keys) {
            const commentsList: string[] = await findInCacheList(key);
            if (condition === 'include') {
                if (commentsList.includes(`comment:${commentId}`)) {
                    return key;
                }
            }
            if(key.includes(`comment:${commentId}:replies`)) {
                result.push(...commentsList);
            }
        }
        cursor = newCursor;
    } while (cursor !== '0');
    return result;
}

export const deleteCommentInPostCache = async (key : string, commentId : string) => {
    const commentKey = `comment:${commentId}`;
    await redis.lrem(key, 0, commentKey);
}

export const insertReplayToCache = async (commentId : string, replay : TInferSelectReplies) => {
    await Promise.all([redis.rpush(`comment:${commentId}:replies`, `replay:${replay.id}`), redis.hmset(`replay:${replay.id}`, replay)]);
    await Promise.all([setExpiresTime(`replay:${replay.id}`, 1209600), setExpiresTime(`comment:${commentId}:replies`, 1209600)]);
}

export const deleteRepliesOnCommentCache = async (commentId : string) => {
    const repliesId : string[] = await findRequestedKeyInCacheList(`comment`, 'replies', commentId, 'search') as string[];
    await Promise.all(repliesId.map(async key => await deleteCache(key)));
    await redis.del(`comment:${commentId}:replies`);
}