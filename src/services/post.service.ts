import type { NextFunction } from 'express';
import type { TFixedPostResult } from '../@types';
import { db } from '../db/db';
import ErrorHandler from '../utils/errorHandler';

export const fixedResult = <T extends TFixedPostResult>(post : T) => {
    
    const author = post.author;
    const comment = post.comments.map(comment => comment.comment,);
    const likes = post.likes.map(like => like.user);

    const fixedPostResult = {
        id : post.id, text : post.text, image : post.image, createdAt : post.createdAt, updatedAt : post.updatedAt,
        author : {id : author.id, username : author.username},
        comment : comment.sort((a, b) => new Date(b!.createdAt!).getTime() - new Date(a!.createdAt!).getTime()),
        like : likes.map(liker => ({id : liker!.id, username : liker!.username}))
    }

    return fixedPostResult;
}

export const findPostWithRelations = async (postId : string, next : NextFunction) : Promise<TFixedPostResult | void> => {
    
    try {
        const post = await db.query.PostTable.findFirst({
            where : (table, funcs) => funcs.eq(table.id, postId),
            with : {
                author : true,
                comments : {columns : {postId : false, commentId : false}, with : {comment : true}},
                likes : {columns : {postId : false, userId : false}, with : {user : true}}
            }
        });
        if(!post) return next(new ErrorHandler('Invalid Id - Post not found', 400));
    
        return post as TFixedPostResult;

    } catch (error : any) {
        return next(new ErrorHandler(error.message, 400));
    }
}