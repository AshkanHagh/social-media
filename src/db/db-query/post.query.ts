import { and, eq, sql } from 'drizzle-orm';
import type { TFindPostWithRelations, TInferSelectLike, TInferSelectPost } from '../../@types';
import { db } from '../db';
import { CommentTable, LikesTable, PostTable } from '../schema';
import type { PgTable, TableConfig } from 'drizzle-orm/pg-core';

export const insertPost = async (authorId : string, text : string, image : string) : Promise<TInferSelectPost> => {
    const post = await db.insert(PostTable).values({authorId, text, image : image || ''}).returning();
    const postResult = post[0] as TInferSelectPost;
    return postResult;
}

export const findFirstPostWithPostId = async (postId : string) => {
    const post = await db.query.PostTable.findFirst({
        where : (table, funcs) => funcs.eq(table.id, postId)
    });
    return post;
}

export const findPostWithRelations = async (postId : string) : Promise<TFindPostWithRelations> => {
    const post = await db.query.PostTable.findFirst({
        where : (table, funcs) => funcs.eq(table.id, postId),
        with : {
            author : {with : {profileInfo : {columns : {profilePic : true, gender : true}}}},
            comments : {limit : 10, columns : {commentId : false, postId : false}, with : {comment : true}},
            likes : {limit : 10, with : {user : true}}
        }
    });

    return post as TFindPostWithRelations;
}

export const findManyPostWithRelations = async () => {
    const posts = await db.query.PostTable.findMany({
        with : {author : true}
    });
    return posts;
}

export const findFirstLikes = async (postId : string, userId : string) : Promise<TInferSelectLike> => {
    const likes = await db.query.LikesTable.findFirst({
        where : (table, funcs) => funcs.and(funcs.eq(table.postId, postId), funcs.eq(table.userId, userId))
    });
    return likes as TInferSelectLike;
}

export const insertLike = async (postId : string, userId : string) : Promise<void> => {
    await db.insert(LikesTable).values({postId, userId : userId});
}

export const deleteLike = async (postId : string, userId : string) : Promise<void> => {
    await db.delete(LikesTable).where(and(eq(LikesTable.postId, postId), eq(LikesTable.userId, userId)));
}

export const findManyCommentOnPost = async (postId : string) => {
    return await db.query.PostCommentTable.findMany({where : (table, funcs) => funcs.eq(table.postId, postId)});
}

export const deletePostTable = async (postId : string, authorId : string) => {
    const commentOnPost = await findManyCommentOnPost(postId);
    await Promise.all(commentOnPost.map(async comment => {
        await db.delete(CommentTable).where(eq(CommentTable.id, comment.commentId!))
    }));
    await db.delete(PostTable).where(and(eq(PostTable.authorId, authorId), eq(PostTable.id, postId)));
}

export const countedRows = async (table : PgTable<TableConfig>): Promise<number> => {
    const result = await db.select({ count: sql`count(*)`.mapWith(Number) }).from(table);
    return result[0].count;
};

export const findManyLimited = async (limit: number, offset: number) => {
    const posts = await db.query.PostTable.findMany({
        with : {author : true},
        limit, offset,
    });
    return posts;
}