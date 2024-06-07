import type { Request, Response, NextFunction } from 'express';
import { CatchAsyncError } from '../middlewares/catchAsyncError';
import type { TInferSelectComment } from '../@types';
import { addComment, deleteSingleCommentService, getPostComments, updateCommentText } from '../services/comment.service';

export const newComment = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { text } = req.body as TInferSelectComment;
        const { id : postId } = req.params as {id : string};
        const userId = req.user!.id;

        const comment = await addComment(postId, userId, text);
        res.status(200).json({success : true, comment});

    } catch (error : any) {
        return next(error);
    }
});

export const getComments = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { id : postId } = req.params as {id : string};
        const { page, limit } = req.query as {page : string, limit : string}
        const comments = await getPostComments(postId, limit == undefined ? 9 : +limit, page == undefined ? 0 : (+page * 10) -1);
        res.status(200).json({success : true, comments});
        
    } catch (error : any) {
        return next(error);
    }
});

export const editComment = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { text } = req.body as {text : string};
        const { id : commentId } = req.params as {id : string};

        const message = await updateCommentText(commentId, req.user!.id, text);
        res.status(200).json({success : true, message});
        
    } catch (error) {
        return next(error);
    }
});

export const deleteSingleComment = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { id : commentId } = req.params as {id : string};
        const currentUserId = req.user!.id;
        const message = await deleteSingleCommentService(commentId, currentUserId);
        res.status(200).json({success : 200, message});
        
    } catch (error) {
        return next(error);
    }
});