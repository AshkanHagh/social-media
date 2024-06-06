import type { Request, Response, NextFunction } from 'express';
import { CatchAsyncError } from '../middlewares/catchAsyncError';
import type { TFindPostWithAuthor, TInferSelectPost, TInferSelectUser } from '../@types';
import { newPost, paginationPost, getSinglePost, likePostService, delPost } from '../services/post.service';
import ErrorHandler from '../utils/errorHandler';
import { PostTable } from '../db/schema';

export const createPost = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { text, image } = req.body as TInferSelectPost;
        const user = req.user as TInferSelectUser;
        const post = await newPost(user, text, image!);

        res.status(200).json({success : true, post});

    } catch (error : any) {
        return next(new ErrorHandler(`An error occurred : ${error.message}`, 400));
    }
});

export const singlePost = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { id : postId } = req.params as {id : string};
        const { view, cachedPost, post_result } = await getSinglePost(postId);
        res.status(200).json({success : true, view, post : cachedPost == undefined ? post_result : cachedPost});
        
    } catch (error : any) {
        return next(new ErrorHandler(`An error occurred : ${error.message}`, 400));
    }
});

export const posts = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { page, limit } = req.query as {page : string, limit : string};
        const post = await paginationPost(PostTable as unknown as any, page, limit) as TFindPostWithAuthor[];
        res.status(200).json({success : true, posts : post});
        
    } catch (error : any) {
        return next(new ErrorHandler(`An error occurred : ${error.message}`, 400));
    }
});

export const likePost = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { id : postId } = req.params as {id : string};
        const user = req.user as TInferSelectUser;

        const message = await likePostService(postId, user.id);
        res.status(200).json({success : true, message});
        
    } catch (error : any) {
        return next(new ErrorHandler(`An error occurred : ${error.message}`, 400));
    }
});

export const deletePost = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { id : postId } = req.params as {id : string};
        const currentUserId = req.user?.id;

        const message = await delPost(postId, currentUserId!);
        res.status(200).json({success : true, message});

    } catch (error : any) {
        return next(new ErrorHandler(`An error occurred : ${error.message}`, 400));
    }
});