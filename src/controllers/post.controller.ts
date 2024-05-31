import type { Request, Response, NextFunction } from 'express';
import { CatchAsyncError } from '../middlewares/catchAsyncError';
import ErrorHandler from '../utils/errorHandler';
import { validateNewComment, validateNewPost } from '../validations/Joi';
import type { TFixedPostResult, TInferSelectComment, TInferSelectLike, TInferSelectPost, TInferSelectUser } from '../@types';
import { db } from '../db/db';
import { CommentTable, LikesTable, PostCommentTable, PostTable } from '../db/schema';
import redis from '../db/redis';
import { findPostWithRelations, fixedResult } from '../services/post.service';
import { and, eq } from 'drizzle-orm';

export const createPost = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const {error, value} = validateNewPost(req.body);
        if(error) return next(new ErrorHandler(error.message, 400));
        const { text, image } = value as TInferSelectPost;
        const user = req.user as TInferSelectUser;

        const post = await db.insert(PostTable).values({authorId : user.id, text, image : image || ''}).returning();
        const postResult = post[0] as TInferSelectPost;

        await redis.set(`post:${postResult.id}`, JSON.stringify(postResult), 'EX', 1209600);

        res.status(200).json({success : true, post : postResult});

    } catch (error : any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export const singlePost = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { id : postId } = req.params as {id : string};

        const requestCountKey = `posts:requests`;
        await redis.zincrby(requestCountKey, 1, postId);
        const requestCount = await redis.zscore(requestCountKey, postId);

        const data = await redis.get(`post:${postId}`);
        if(!data || data.length <= 0) {

            const post = await findPostWithRelations(postId, next);
            const fixedPostResult = fixedResult(post as TFixedPostResult);

            await redis.set(`post:${postId}`, JSON.stringify(fixedPostResult), 'EX', 1209600);
            return res.status(200).json({success : true, view : requestCount, fixedPostResult});
        }

        const post : TInferSelectPost = JSON.parse(data!);
        res.status(200).json({success : true, view : requestCount, post});
        
    } catch (error : any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export const posts = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const posts = await db.query.PostTable.findMany({
            with : {
                author : true, 
                comments : {columns : {postId : false, commentId : false}, with : {comment : true}}, 
                likes : {with : {user : true}}
            }
        });
        const mappedPost = await Promise.all(posts.map(async post => {
            const fixedPostResult = fixedResult(post as TFixedPostResult);
            return fixedPostResult;
        }));

        await Promise.all(mappedPost.map(async post => {
            await redis.set(`post:${post.id}`, JSON.stringify(post), 'EX', 1209600);
        }));

        const sortedPosts = mappedPost.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
        res.status(200).json({success : true, posts : sortedPosts.filter(Boolean)});
        
    } catch (error : any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export const likePost = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { id : postId } = req.params as {id : string};
        const user = req.user as TInferSelectUser;
        
        const isLiked = await db.query.LikesTable.findFirst({
            where : (table, funcs) => funcs.and(funcs.eq(table.postId, postId), funcs.eq(table.userId, user.id))
        });

        if(!isLiked) {
            const like = await db.insert(LikesTable).values({postId, userId : user.id}).returning();
            const likeResult : TInferSelectLike = like[0];

            const post = await findPostWithRelations(postId, next);
            const fixedPostResult = fixedResult(post as TFixedPostResult);
            await redis.set(`post:${postId}`, JSON.stringify(fixedPostResult), 'EX', 1209600);

            return res.status(200).json({success : true, message : 'Post has been liked'});
        }
        
        const dislike = await db.delete(LikesTable).where(and(eq(LikesTable.postId, postId), eq(LikesTable.userId, user.id)));
        const post = await findPostWithRelations(postId, next);
        const fixedPostResult = fixedResult(post as TFixedPostResult);

        await redis.set(`post:${postId}`, JSON.stringify(fixedPostResult), 'EX', 1209600);

        return res.status(200).json({success : true, message : 'Post has been disliked'});
        
    } catch (error : any) {
        return next(new ErrorHandler(error.message, 400));
    }
});