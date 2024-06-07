import { findInCache, setExpiresTime } from '.';
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

export const findCommentInPostCache = async () => {
    let cursor = '0';
    let keysList;
    do {
        const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'post:*:comments', 'COUNT', 100);
        for (const key of keys) {
            keysList = key
        }
        cursor = newCursor;
    } while (cursor !== '0');
    return keysList;
}

export const deleteCommentInPostCache = async (key : string, commentId : string) => {
    const commentKey = `comment:${commentId}`
    await redis.lrem(key, 0, commentKey);
}