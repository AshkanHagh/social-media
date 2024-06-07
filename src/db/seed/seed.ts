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

    for(let index = 0; index <= 500; index++) {

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

        await db.insert(FollowersTable).values({followerId : userResult.id, followedId : 'a76d48fd-7c4b-4b11-8556-348fce790979'});
        await db.insert(LikesTable).values({postId : '35c4d880-0ef6-42f5-8502-a6b771065d20', userId : userResult.id});

        const comment = await db.insert(CommentTable).values({authorId : userResult.id, text : faker.lorem.words()}).returning();
        const commentResult : TInferSelectComment = comment[0];
        await db.insert(PostCommentTable).values({postId : '35c4d880-0ef6-42f5-8502-a6b771065d20', commentId : commentResult.id});
    }

    console.log('end');
    process.exit(0);
}

main().catch((error : any) => {
    console.error(error.message);
    process.exit(0);
});