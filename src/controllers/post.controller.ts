import type { Request, Response, NextFunction } from 'express';
import { CatchAsyncError } from '../middlewares/catchAsyncError';
import type { TFindPostWithRelations, TInferSelectPost, TInferSelectUser } from '../@types';
import { newPostService, paginationPostService, getSinglePostService, likePostService, delPostService } from '../services/post.service';
import ErrorHandler from '../utils/errorHandler';
import { PostTable } from '../db/schema';

export const createPost = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { text, image } = req.body as TInferSelectPost;
        const user = req.user as TInferSelectUser;
        const post = await newPostService(user, text, image!);

        res.status(200).json({success : true, post});

    } catch (error : any) {
          return next(error);
    }
});

export const singlePost = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { id : postId } = req.params as {id : string};
        const { view, cachedPost, post_result } = await getSinglePostService(postId);
        res.status(200).json({success : true, view, post : cachedPost == undefined ? post_result : cachedPost});
        
    } catch (error : any) {
          return next(error);
    }
});

export const posts = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { page, limit } = req.query as {page : string, limit : string};
        const post = await paginationPostService(PostTable as unknown as any, page, limit);
        res.status(200).json({success : true, posts : post});
        
    } catch (error : any) {
          return next(error);
    }
});

export const likePost = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { id : postId } = req.params as {id : string};
        const user = req.user as TInferSelectUser;

        const message = await likePostService(postId, user.id);
        res.status(200).json({success : true, message});
        
    } catch (error : any) {
          return next(error);
    }
});

export const deletePost = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { id : postId } = req.params as {id : string};
        const currentUserId = req.user?.id;

        const message = await delPostService(postId, currentUserId!);
        res.status(200).json({success : true, message});

    } catch (error : any) {
          return next(error);
    }
});