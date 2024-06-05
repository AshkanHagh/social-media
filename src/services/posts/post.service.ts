import type { TFindPostWithAuthor, TInferSelectPost, TInferSelectUser, TQueryTable } from '../../@types';
import { increaseViews, insertPostCache } from '../../db/secondary-database-queries/posts/posts.cache';
import { deleteLike, deletePostTable, findFirstLikes, findFirstPostWithPostId, findManyLimited, findPostWithRelations, insertLike, insertPost } from '../../db/primary-database-queries/posts/post.query';
import { pagination } from '../../utils/paginations';
import { findInCache } from '../../db/secondary-database-queries/users/users.cache';
import { ForbiddenError, ResourceNotFoundError } from '../../utils/customErrors';

export const fixedPostResult = <T extends TFindPostWithAuthor>(post : T) => {
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
        insertPostCache('post', author.id, combinedPostAndAuthorResult as unknown as string, 1209600);
        return post;

    } catch (error) {
        throw error;
    }
}

export const getSinglePost = async (postId : string) => {
    try {
        const view = await increaseViews(postId);

        const cachedPost = await findInCache('post', postId);
        if(!cachedPost || Object.keys(cachedPost).length <= 0) {

            const post = await findPostWithRelations(postId);
            const post_result = fixedPostResult(post);

            await insertPostCache('post', postId, post_result as unknown as string, 1209600)
            return {view, post_result};
        }
        return {view, cachedPost}

    } catch (error) {
        throw error;
    }
}

export const paginationPost = async <T>(table : TQueryTable<T>, page : string, limit : string) => {

    try {
        const { results, limitNumber, startIndex } = await pagination(page, limit, table);
        const posts = await findManyLimited(limitNumber, startIndex);
        const post = posts as unknown as TFindPostWithAuthor[];

        const mappedPost = await Promise.all(post.map(async post => {
            const fixedResult = fixedPostResult(post);
            return fixedResult;
        }))
        const sortedPosts = mappedPost.sort((a, b) => new Date(b!.createdAt!).getTime() - new Date(a!.createdAt!).getTime());
        await Promise.all(mappedPost.map(async post => {
            await insertPostCache('post', post.id, post as unknown as string, 1209600)
        }));

        results.results = sortedPosts;
        return results
        
    } catch (error) {
        throw error;
    }
}

export const likePostService = async (postId : string, userId : string) => {
    try {
        const isLiked = await findFirstLikes(postId, userId);
        if(!isLiked) {insertLike(postId, userId); return 'Post has been liked'}

        deleteLike(postId, userId);
        return 'Post has been disliked'

    } catch (error) {
        throw error;
    }
}

export const delPost = async (postId : string, currentUserId : string) => {
    try {
        const post = await findFirstPostWithPostId(postId);
        if(!post) throw new ResourceNotFoundError();
        if(post?.authorId !== currentUserId) throw new ForbiddenError();

        await deletePostTable(postId, currentUserId!);
        return 'Post has been deleted successfully';
        
    } catch (error) {
        throw error;
    }
}