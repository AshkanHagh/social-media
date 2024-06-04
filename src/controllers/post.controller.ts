import type { Request, Response, NextFunction } from 'express';
import { CatchAsyncError } from '../middlewares/catchAsyncError';
import type { TFindPostWithAuthor, TInferSelectComment, TInferSelectLike, TInferSelectPost, TInferSelectUser } from '../@types';
import redis from '../db/redis';
import { increaseViews, findPostWithRelations, insertPost, paginationPost, findManyPostWithRelations, fixedPostResult, findFirstLikes, insertLike, deleteLike } from '../services/post.service';
import { InternalServerError } from '../utils/customErrors';

export const createPost = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { text, image } = req.body as TInferSelectPost;
        const user = req.user as TInferSelectUser;
        const post = await insertPost(user.id, text, image!);

        res.status(200).json({success : true, post});

    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});

export const singlePost = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { id : postId } = req.params as {id : string};
        const view = await increaseViews(postId);

        const cachedPost = await redis.hgetall(`post:${postId}`);
        if(!cachedPost || Object.keys(cachedPost).length <= 0) {

            const post = await findPostWithRelations(postId);
            const post_result = fixedPostResult(post);

            await redis.hset(`post:${postId}`, post_result);
            return res.status(200).json({success : true, view, post_result});
        }
        res.status(200).json({success : true, view, post : cachedPost});
        
    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});

export const posts = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const post = await paginationPost(req, next) as TFindPostWithAuthor[];
        res.status(200).json({success : true, posts : post});
        
    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});

export const likePost = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { id : postId } = req.params as {id : string};
        const user = req.user as TInferSelectUser;
        const isLiked = await findFirstLikes(postId, user.id);

        if(!isLiked) {
            insertLike(postId, user.id);
            return res.status(200).json({success : true, message : 'Post has been liked'});
        }
        deleteLike(postId, user.id);
        return res.status(200).json({success : true, message : 'Post has been disliked'});
        
    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});