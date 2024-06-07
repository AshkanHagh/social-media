import type { TInferSelectComment, TInferSelectPost, TInferSelectReplies } from '../@types';
import { deleteComment, findPostComments, insertComment, insertPostComment, updateCommentDetails } from '../db/db-query/comment.query';
import { findInCache, insertIntoCache } from '../db/redis-query';
import { deleteCommentInPostCache, findCommentInPostCache, findCommentsIdInCache, insertCommentToCache } from '../db/redis-query/comment.cache';
import { ForbiddenError, ResourceNotFoundError } from '../utils/customErrors';
import ErrorHandler from '../utils/errorHandler';

export const addComment = async (postId : string, userId : string, text : string) => {
    try {
        const isPostExists : TInferSelectPost = await findInCache(`post:${postId}`);
        if(Object.keys(isPostExists).length <= 0) throw new ResourceNotFoundError();
        const comment = await insertComment(userId, text);

        await insertPostComment(postId, comment.id);
        await insertCommentToCache(postId, comment);
        return comment;

    } catch (error : any) {
        throw new ErrorHandler(`An error occurred: ${error.message}`, error.statusCode);
    }
}

export const getPostComments = async (postId : string, limit : number, offset : number) : Promise<TInferSelectComment[]> => {
    try {
        const isPostExists : TInferSelectPost = await findInCache(`post:${postId}`);
        const commentIds = await findCommentsIdInCache(postId, limit, offset);

        if (!isPostExists || commentIds.length <= 0) {
            const comments = await findPostComments(postId);
            await Promise.all(comments.map(async comment => {
                await insertCommentToCache(postId, comment);
            }));
            return comments.slice(0, 10) as TInferSelectComment[];
        }

        const comments : TInferSelectComment[] = await Promise.all(commentIds.map(async commentId => {
            const comment : TInferSelectComment = await findInCache(commentId);
            return mapRedisDataToComment(comment);
        }));
        const sorted = comments.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
        return sorted

    } catch (error: any) {
        throw new ErrorHandler(`An error occurred: ${error.message}`, error.statusCode);
    }
}

const mapRedisDataToComment = (data : TInferSelectComment) : TInferSelectComment => {
    return { id : data.id, text: data.text, authorId: data.authorId || null, 
        createdAt: data.createdAt ? new Date(data.createdAt) : null, updatedAt: data.updatedAt ? new Date(data.updatedAt) : null
    };
}

export const updateCommentText = async (commentId : string, authorId : string, text : string) => {
    try {
        const comment : TInferSelectReplies = await findInCache(`comment:${commentId}`);
        if(comment.authorId !== authorId) throw new ForbiddenError();

        await updateCommentDetails(commentId, authorId, text).catch(console.error);
        await insertIntoCache(`comment`, commentId, comment, 1209600);
        return 'Post has been updated';
        
    } catch (error : any) {
        throw new ErrorHandler(`An error occurred: ${error.message}`, error.statusCode);
    }
}

export const deleteSingleCommentService = async (commentId : string, currentUserId : string) => {
    try {
        const key = await findCommentInPostCache();
        await deleteComment(commentId, currentUserId);

        await deleteCommentInPostCache(key!, commentId);
        return 'Comment has been deleted';
        
    } catch (error : any) {
        throw new ErrorHandler(`An error occurred: ${error.message}`, error.statusCode);
    }
}