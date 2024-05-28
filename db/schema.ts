import { relations } from 'drizzle-orm';
import { boolean, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const RoleEnum = pgEnum('roleEnum', ['admin', 'user']);
export const GenderEnum = pgEnum('genderEnum', ['male', 'female'])

export const UserTable = pgTable('users', {
    id : uuid('id').primaryKey().defaultRandom(),
    fullName : varchar('fullName', {length : 255}).notNull(),
    email : varchar('email', {length : 255}).notNull().unique(),
    username : varchar('username', {length : 255}).notNull().unique(),
    profilePic : text('profilePic').default(''),
    bio : varchar('fullName', {length : 500}).notNull().default(''),
    role : RoleEnum('role').default('user'),
    isBan : boolean('isBan').default(false),
    isFreeze : boolean('isFreeze').default(false),
    gender : GenderEnum('gender').notNull(),
    password : text('password').notNull(),
    createdAt : timestamp('createdAt').defaultNow(),
    updatedAt : timestamp('updatedAt').defaultNow()
});

export const FollowsTable = pgTable('followers', {
    id : uuid('id').primaryKey().defaultRandom(),
    userId : uuid('userId').references(() => UserTable.id).notNull(),
    followerId : uuid('followerId').references(() => UserTable.id).notNull(),
    createdAt : timestamp('createdAt').defaultNow(),
    updatedAt : timestamp('updatedAt').defaultNow()
});

export const PostTable = pgTable('posts', {
    id : uuid('id').primaryKey().defaultRandom(),
    title : varchar('title', {length : 255}).notNull(),
    description : varchar('fullName', {length : 500}).notNull(),
    image : text('image').default(''),
    isPublish : boolean('isPublish').default(false),
    authorId : uuid('author').references(() => UserTable.id),
    createdAt : timestamp('createdAt').defaultNow(),
    updatedAt : timestamp('updatedAt').defaultNow()
});

export const UserTableRelations = relations(UserTable, ({many}) => {
    return {
        followings : many(FollowsTable),
        posts : many(PostTable)
    }
});

export const FollowsTableRelations = relations(FollowsTable, ({one, many}) => {
    return {
        users : one(UserTable, {
            fields : [FollowsTable.userId],
            references : [UserTable.id]
        }),
        follows : one(UserTable, {
            fields : [FollowsTable.followerId],
            references : [UserTable.id]
        })
    }
});

export const PostTableRelations = relations(PostTable, ({one}) => {
    return {
        author : one(UserTable, {
            fields : [PostTable.authorId],
            references : [UserTable.id]
        })
    }
});