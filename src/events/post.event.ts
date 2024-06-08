import { EventEmitter } from 'node:events';
import { findManyLimited } from '../db/db-query/post.query';
import { insertIntoCache } from '../db/redis-query';

export const eventEmitter = new EventEmitter();

eventEmitter.on('getAllPosts', async () => {
    const posts = await findManyLimited(0, 0);
    await Promise.all(posts.map(async post => {
        await insertIntoCache(`post`, post.id, post, 1209600);
    }));
})