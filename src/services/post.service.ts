import type { NextFunction, Request } from 'express';
import type { TFindPostWithAuthor, TInferSelectLike, TInferSelectPost, TPagination } from '../@types';
import { db } from '../db/db';
import ErrorHandler from '../utils/errorHandler';
import { and, eq, sql } from 'drizzle-orm';
import { LikesTable, PostTable } from '../db/schema';
import redis from '../db/redis';

export const fixedPostResult = <T extends TFindPostWithAuthor>(post : T) => {
    const { fullName : authorFullName, email : authorEmail, username : authorUsername, role : authorRole } = post.author;
    const { id, text, image, authorId, createdAt, updatedAt } = post;
    const postResult = {
        id, text, image, authorId, createdAt, updatedAt,
        authorFullName, authorEmail, authorUsername, authorRole
    }
    return postResult;
}

export const insertPost = async (authorId : string, text : string, image : string) : Promise<TInferSelectPost> => {
    const post = await db.insert(PostTable).values({authorId, text, image : image || ''}).returning();
    const postResult = post[0] as TInferSelectPost;

    await redis.hset(`post:${postResult.id}`, postResult);
    await redis.expire(`post:${postResult.id}`, 1209600);
    return postResult;
}

export const increaseViews = async (postId : string) : Promise<string> => {
    const requestCountKey = `posts:requests`;
    await redis.zincrby(requestCountKey, 1, postId);
    const requestCount = await redis.zscore(requestCountKey, postId);
    return requestCount as string;
}

export const findPostWithRelations = async (postId : string) : Promise<TFindPostWithAuthor> => {
    const post = await db.query.PostTable.findFirst({
        where : (table, funcs) => funcs.eq(table.id, postId),
        with : {author : true}
    });

    return post as TFindPostWithAuthor;
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

export const startAndLimitPagination = (req : Request) => {
    let { page, limit } = req.query as {page : string, limit : string};
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    const startIndex = (pageNumber - 1) * limitNumber;
    const endIndex = pageNumber * limitNumber;

    return {startIndex, endIndex, pageNumber, limitNumber};
}

export const paginationPost = async (req : Request, next : NextFunction) : Promise<TPagination | TFindPostWithAuthor[] | void> => {

    try {
        const { startIndex, endIndex, pageNumber, limitNumber } = startAndLimitPagination(req);
        const results = <TPagination>{};
        const countedRows = await db.select({count : sql`count(*)`.mapWith(Number)}).from(PostTable);

        endIndex < countedRows[0].count ? results.next = {page : pageNumber + 1, limit : limitNumber} : undefined;
        startIndex > 0 ? results.previous = {page : pageNumber - 1, limit : limitNumber} : undefined;

        const posts = await db.query.PostTable.findMany({
            with : {author : true},
            limit : limitNumber, offset : startIndex,
        });

        const mappedPost = await Promise.all(posts.map(async post => {
            const fixedResult = fixedPostResult(post)
            return fixedResult;
        }))
        const sortedPosts = mappedPost.sort((a, b) => new Date(b!.createdAt!).getTime() - new Date(a!.createdAt!).getTime());
        await Promise.all(mappedPost.map(async post => {
            await redis.hset(`post:${post.id}`, post);
        }));

        results.result = sortedPosts;
        return results
        
    } catch (error : any) {
        return next(new ErrorHandler(error.message, 400));
    }
}