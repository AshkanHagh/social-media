// import type { Request, Response, NextFunction } from 'express';
// import { CatchAsyncError } from '../middlewares/catchAsyncError';
// import type { TInferSelectComment, TInferSelectUser } from '../@types';
// import { db } from '../db/db';
// import { CommentTable, PostCommentTable } from '../db/schema';
// import redis from '../db/redis';
// import { InternalServerError, InvalidUserIdError, ValidationError } from '../utils/customErrors';

// export const newComment = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

//     try {
//         const { text } = req.body as TInferSelectComment;
        
//         const { id : postId } = req.params as {id : string};
//         const user = req.user as TInferSelectUser;

//         const comment = await db.insert(CommentTable).values({authorId : user.id, text}).returning();
//         const commentResult : TInferSelectComment = comment[0];
//         await db.insert(PostCommentTable).values({postId, commentId : commentResult.id}).execute();

//         await redis.set(`comment:${commentResult.id}`, JSON.stringify(commentResult), 'EX', 1209600);

//         const post = await db.query.PostTable.findFirst({
//             where : (table, funcs) => funcs.eq(table.id, postId),
//             with : {
//                 author : true,
//                 comments : {columns : {commentId : false, postId : false}, with : {comment : true}},
//                 likes : {with : {user : true}}
//             }
//         });
//         if(!post) return next(new InvalidUserIdError());

//         const author = post.author;
//         const comments = post.comments.map(comment => comment.comment);

//         const fixedPostResult = {
//             id : post.id, text : post.text, image : post.image, createdAt : post.createdAt, updatedAt : post.updatedAt,
//             author : {id : author.id, username : author.username},
//             comment : comments.sort((a, b) => new Date(b!.createdAt!).getTime() - new Date(a!.createdAt!).getTime()),
//             like : post.likes.map(like => like.user)
//         }
//         await redis.set(`post:${postId}`, JSON.stringify(fixedPostResult), 'EX', 1209600);

//         res.status(200).json({success : true, comment : commentResult});

//     } catch (error : any) {
//         return next(new InternalServerError(`An error occurred: ${error.message}`));
//     }
// });