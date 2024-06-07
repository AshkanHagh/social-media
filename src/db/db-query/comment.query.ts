import { and, eq } from "drizzle-orm";
import type { TInferSelectComment, TInferSelectReplies } from "../../@types";
import { db } from "../db";
import { CommentTable, PostCommentTable, RepliesTable } from "../schema";

export const insertComment = async (authorId : string, text : string) : Promise<TInferSelectComment> => {
    const comment = await db.insert(CommentTable).values({authorId, text}).returning();
    const commentResult : TInferSelectComment = comment[0];
    return commentResult
}

export const insertPostComment = async (postId : string, commentId : string) : Promise<void> => {
    await db.insert(PostCommentTable).values({postId, commentId}).execute();
}

export const findPostComments = async (postId : string) => {
    const comment = await db.query.PostCommentTable.findMany({
        where : (table, funcs) => funcs.eq(table.postId, postId),
        with : {comment : true}, columns : {postId : false, commentId : false}
    });
    return comment.map(comment => comment.comment as TInferSelectComment);
}

export const updateCommentDetails = async (commentId : string, authorId : string, text : string) => {
    await db.update(CommentTable).set({text}).where(and(eq(CommentTable.id, commentId), eq(CommentTable.authorId, authorId)));
}

export const deleteComment = async (commentId : string, authorId : string) => {
    await db.delete(CommentTable).where(and(eq(CommentTable.id, commentId), eq(CommentTable.authorId, authorId)));
}