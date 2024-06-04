import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { CommentTable, FollowersTable, LikesTable, PostCommentTable, PostTable, ProfileInfoTable, UserTable } from '../schema';
import type { TInferSelectComment, TInferSelectPost, TInferSelectUser } from '../../@types';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

const pool = postgres(process.env.DATABASE_URL as string);
const db = drizzle(pool);

const main = async () => {
    console.log('seeding started');

    for(let index = 265; index <= 5000; index++) {

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(faker.string.uuid(), salt);

        const randomName = faker.person.fullName();

        const user = await db.insert(UserTable).values({
            fullName : randomName, email : faker.internet.email({firstName : randomName, lastName : `${index}`}), 
            username : faker.internet.userName({firstName : randomName, lastName : `${index}`}), password : hashedPassword
        }).returning();
        const userResult = user[0] as TInferSelectUser;

        const profileInfo = await db.insert(ProfileInfoTable).values({
            userId : userResult.id, bio : faker.person.bio(), gender : faker.person.sexType(), profilePic : faker.image.avatar()
        });

        const post = await db.insert(PostTable).values({
            authorId : userResult.id, text : faker.lorem.text(), image : faker.image.url()
        }).returning();
        const postResult = post[0] as TInferSelectPost;

        await db.insert(FollowersTable).values({followerId : userResult.id, followedId : '98be620b-f0c0-4dac-8752-a9fe9abb487d'});
        await db.insert(LikesTable).values({postId : '45fbf38d-ae64-4c37-bb29-a76e59b145a2', userId : userResult.id});

        const comment = await db.insert(CommentTable).values({authorId : userResult.id, text : faker.lorem.words()}).returning();
        const commentResult : TInferSelectComment = comment[0];
        await db.insert(PostCommentTable).values({postId : '45fbf38d-ae64-4c37-bb29-a76e59b145a2', commentId : commentResult.id});
    }

    console.log('end');
    process.exit(0);
}

main().catch((error : any) => {
    console.error(error.message);
    process.exit(0);
});