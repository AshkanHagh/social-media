import { relations } from 'drizzle-orm';
import { boolean, pgEnum, pgTable, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const RoleEnum = pgEnum('roleEnum', ['admin', 'user']);
export const GenderEnum = pgEnum('genderEnum', ['male', 'female'])

export const UserTable = pgTable('users', {
    id : uuid('id').primaryKey().defaultRandom(),
    fullName : varchar('fullName', {length : 255}).notNull(),
    username : varchar('username', {length : 255}).notNull().unique(),
    email : varchar('email', {length : 255}).notNull().unique(),
    role : RoleEnum('role').default('user'),
    password : text('password').notNull(),
    createdAt : timestamp('createdAt').defaultNow(),
    updatedAt : timestamp('updatedAt').defaultNow()
});

export const UserProfileInfoTable = pgTable('profileInfo', {
    userId : uuid('userId').references(() => UserTable.id),
    profilePic : text('profilePic'),
    bio : varchar('fullName', {length : 500}).notNull(),
    gender : GenderEnum('gender').notNull(),
    isBan : boolean('isBan').default(false),
    isFreeze : boolean('isFreeze').default(false)
}, table => {
    return {pk : primaryKey({columns : [table.userId]})}
});

export const FollowersTable = pgTable('followers', {
    userId : uuid('userId').references(() => UserTable.id),
    followersId : uuid('followersId').references(() => UserTable.id),
});

export const FollowingTable = pgTable('following', {
    userId : uuid('userId').references(() => UserTable.id),
    followingId : uuid('followingId').references(() => UserTable.id),
});

export const UserTableRelations = relations(UserTable, ({one, many}) => {
    return {
        profileInfo : one(UserProfileInfoTable),
        followers : one(FollowersTable, {
            fields : [UserTable.id],
            references : [FollowersTable.userId]
        }),
        following : one(FollowingTable, {
            fields : [UserTable.id],
            references : [FollowingTable.userId]
        })
    }
});

export const ProfileInfoTableRelations = relations(UserProfileInfoTable, ({one}) => {
    return {
        user : one(UserTable, {
            fields : [UserProfileInfoTable.userId],
            references : [UserTable.id]
        })
    }
});

export const FollowersTableRelations = relations(FollowersTable, ({one, many}) => {
    return {
        followers : one(UserTable, {
            fields : [FollowersTable.followersId, FollowersTable.userId],
            references : [UserTable.id, UserTable.id]
        })
    }
});

export const FollowingTableRelations = relations(FollowingTable, ({one, many}) => {
    return {
        following : one(UserTable, {
            fields : [FollowingTable.followingId, FollowingTable.userId],
            references : [UserTable.id, UserTable.id]
        })
    }
});