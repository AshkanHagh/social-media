import type { TFindPostWithRelations, TInferSelectPost, TInferSelectUser, TQueryTable } from '../@types';
import { increaseViews } from '../db/redis-query/posts.cache';
import { deleteLike, deletePostTable, findFirstLikes, findFirstPostWithPostId, findManyLimited, findPostWithRelations, insertLike, insertPost } from '../db/db-query/post.query';
import { pagination } from '../utils/paginations';
import { findInCache, insertIntoCache } from '../db/redis-query';
import { ForbiddenError, ResourceNotFoundError } from '../utils/customErrors';
import ErrorHandler from '../utils/errorHandler';

export const fixedPostResult = <T extends TFindPostWithRelations>(post : T) => {
    const { fullName : authorFullName, email : authorEmail, username : authorUsername, role : authorRole } = post.author;
    const { id, text, image, authorId, createdAt, updatedAt } = post;
    const postResult = {
        id, text, image, authorId, createdAt, updatedAt,
        authorFullName, authorEmail, authorUsername, authorRole
    }
    return postResult;
}

export const newPost = async (author : TInferSelectUser, text : string, image : string) : Promise<TInferSelectPost> => {
    try {
        const post = await insertPost(author.id, text, image || '');

        const postAndAuthor = {...post, author : author};
        const combinedPostAndAuthorResult = fixedPostResult(postAndAuthor);
        insertIntoCache('post', author.id, combinedPostAndAuthorResult, 1209600);
        return post;

    } catch (error : any) {
        throw new ErrorHandler(`An error occurred: ${error.message}`, error.statusCode);
    }
}

export const getSinglePost = async (postId : string) => {
    try {
        const view = await increaseViews(postId);

        const cachedPost = await findInCache(`post:${postId}}`);
        if(!cachedPost || Object.keys(cachedPost).length <= 0) {

            const post = await findPostWithRelations(postId);
            const post_result = fixedPostResult(post);

            await insertIntoCache('post', postId, post_result, 1209600)
            return {view, post_result};
        }
        return {view, cachedPost}

    } catch (error : any) {
        throw new ErrorHandler(`An error occurred: ${error.message}`, error.statusCode);
    }
}

export const paginationPost = async <T>(table : TQueryTable<T>, page : string, limit : string) => {

    try {
        const { results, limitNumber, startIndex } = await pagination(page, limit, table);
        const posts = await findManyLimited(limitNumber, startIndex);
        const post = posts as unknown as TFindPostWithRelations[];

        const mappedPost = await Promise.all(post.map(async post => {
            const fixedResult = fixedPostResult(post);
            return fixedResult;
        }))
        const sortedPosts = mappedPost.sort((a, b) => new Date(b!.createdAt!).getTime() - new Date(a!.createdAt!).getTime());
        await Promise.all(mappedPost.map(async post => {
            await insertIntoCache('post', post.id!, post, 1209600)
        }));

        results.result = sortedPosts;
        return results
        
    } catch (error : any) {
        throw new ErrorHandler(`An error occurred: ${error.message}`, error.statusCode);
    }
}

export const likePostService = async (postId : string, userId : string) => {
    try {
        const isLiked = await findFirstLikes(postId, userId);
        if(!isLiked) {insertLike(postId, userId); return 'Post has been liked'}

        deleteLike(postId, userId);
        return 'Post has been disliked'

    } catch (error : any) {
        throw new ErrorHandler(`An error occurred: ${error.message}`, error.statusCode);
    }
}

export const delPost = async (postId : string, currentUserId : string) => {
    try {
        const post = await findFirstPostWithPostId(postId);
        if(!post) throw new ResourceNotFoundError();
        if(post?.authorId !== currentUserId) throw new ForbiddenError();

        await deletePostTable(postId, currentUserId!);
        return 'Post has been deleted successfully';
        
    } catch (error : any) {
        throw new ErrorHandler(`An error occurred: ${error.message}`, error.statusCode);
    }
}