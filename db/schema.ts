import { relations } from 'drizzle-orm';
import { boolean, pgEnum, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const Role = pgEnum('roleEnum', ['admin', 'user']);
export const Gender = pgEnum('genderEnum', ['male', 'female']);
export const Status = pgEnum('statusEnum', ['ban', 'freeze', 'active']);

export const UserTable = pgTable('users', {
    id : uuid('id').primaryKey().defaultRandom(),
    fullName : varchar('fullName', {length : 255}).notNull(),
    username : varchar('username', {length : 255}).notNull(),
    email : varchar('email', {length : 255}).notNull(),
    role : Role('role').default('user'),
    password : text('password').notNull(),
    createdAt : timestamp('createdAt').defaultNow(),
    updatedAt : timestamp('updatedAt').defaultNow().$onUpdate(() => new Date())
}, table => {
    return {
        emailIndex : uniqueIndex('emailIndex').on(table.email),
        uniqueUsername : unique('uniqueUsername').on(table.username)
    }
});

export const ProfileInfoTable = pgTable('profileInfo', {
    userId : uuid('userId').primaryKey().references(() => UserTable.id),
    profilePic : text('profilePic'),
    bio : varchar('fullName', {length : 500}),
    gender : Gender('gender'),
    account_status : Status('status').default('active')
});

export const FollowersTable = pgTable('followers', {
    followerId : uuid('followerId').references(() => UserTable.id),
    followedId : uuid('followedId').references(() => UserTable.id)
}, table =>{
    return {pk : primaryKey({columns : [table.followedId, table.followerId]})}
});

export const UserTableRelations = relations(UserTable, ({one}) => {
    return {
        profileInfo : one(ProfileInfoTable),
        follower : one(FollowersTable, {
            fields : [UserTable.id],
            references : [FollowersTable.followedId],
            relationName : 'following'
        }),
        followed : one(FollowersTable, {
            fields : [UserTable.id],
            references : [FollowersTable.followerId],
            relationName : 'followers'
        })
    }
});

export const ProfileInfoTableRelations = relations(ProfileInfoTable, ({one}) => {
    return {
        user : one(UserTable, {
            fields : [ProfileInfoTable.userId],
            references : [UserTable.id],
            relationName : 'profileInfo'
        })
    }
});

export const FollowersTableRelations = relations(FollowersTable, ({one, many}) => {
    return {
        follower : one(UserTable, {
            fields : [FollowersTable.followedId],
            references : [UserTable.id],
            relationName : 'followedId'
        }),
        followed : one(UserTable, {
            fields : [FollowersTable.followerId],
            references : [UserTable.id],
            relationName : 'followersId'
        })
    }
})