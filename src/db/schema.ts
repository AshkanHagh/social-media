import { relations } from 'drizzle-orm';
import { pgEnum, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

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
        indexEmail : uniqueIndex('indexEmail').on(table.email),
        indexUsername : uniqueIndex('indexUsername').on(table.username)
    }
});

export const ProfileInfoTable = pgTable('profileInfo', {
    userId : uuid('userId').primaryKey().references(() => UserTable.id, {onDelete : 'cascade'}),
    profilePic : text('profilePic'),
    bio : varchar('bio', {length : 1000}),
    gender : Gender('gender'),
    account_status : Status('status').default('active')
});

export const FollowersTable = pgTable('followers', {
    followerId : uuid('followerId').references(() => UserTable.id, {onDelete : 'cascade'}),
    followedId : uuid('followedId').references(() => UserTable.id, {onDelete : 'cascade'})
}, table =>{
    return {pk : primaryKey({columns : [table.followedId, table.followerId]})}
});

export const PostTable = pgTable('posts', {
    id : uuid('id').primaryKey().defaultRandom(),
    text : varchar('text', {length : 700}).notNull(),
    image : text('image'),
    authorId : uuid('authorId').references(() => UserTable.id, {onDelete : 'cascade'}).notNull(),
    createdAt : timestamp('createdAt').defaultNow(),
    updatedAt : timestamp('updatedAt').defaultNow().$onUpdate(() => new Date())
});

export const CommentTable = pgTable('comments', {
    id : uuid('id').primaryKey().defaultRandom(),
    text : varchar('text', {length : 255}).notNull(),
    authorId : uuid('authorId').references(() => UserTable.id, {onDelete : 'cascade'}),
    createdAt : timestamp('createdAt').defaultNow(),
    updatedAt : timestamp('updatedAt').defaultNow().$onUpdate(() => new Date())
});

export const RepliesTable = pgTable('replies', {
    id : uuid('id').primaryKey().defaultRandom(),
    text : varchar('text', {length : 255}).notNull(),
    commentId : uuid('commentId').references(() => CommentTable.id, {onDelete : 'cascade'}),
    createdAt : timestamp('createdAt').defaultNow(),
    updatedAt : timestamp('updatedAt').defaultNow().$onUpdate(() => new Date())
});

export const LikesTable = pgTable('likes', {
    postId : uuid('postId').references(() => PostTable.id, {onDelete : 'cascade'}),
    userId : uuid('userId').references(() => UserTable.id, {onDelete : 'cascade'})
}, table => {
    return {pk : primaryKey({columns : [table.postId, table.userId]})}
});

export const PostCommentTable = pgTable('post_comment', {
    postId : uuid('postId').references(() => PostTable.id),
    commentId : uuid('commentId').references(() => CommentTable.id, {onDelete : 'cascade'}),
}, table => {
    return {pk : primaryKey({columns : [table.postId, table.commentId]})}
});

export const UserTableRelations = relations(UserTable, ({one, many}) => {
    return {
        profileInfo : one(ProfileInfoTable),
        followers : one(FollowersTable, {
            fields : [UserTable.id],
            references : [FollowersTable.followerId],
            relationName : 'follower'
        }),
        followed : one(FollowersTable, {
            fields : [UserTable.id],
            references : [FollowersTable.followedId],
            relationName : 'followed'
        }),
        posts : many(PostTable),
        comments : many(CommentTable),
        likes : many(LikesTable)
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
        followed : one(UserTable, {
            fields : [FollowersTable.followedId],
            references : [UserTable.id],
            relationName : 'followedId'
        }),
        follower : one(UserTable, {
            fields : [FollowersTable.followerId],
            references : [UserTable.id],
            relationName : 'followersId'
        })
    }
});

export const PostTableRelations = relations(PostTable, ({one, many}) => {
    return {
        author : one(UserTable, {
            fields : [PostTable.authorId],
            references : [UserTable.id],
            relationName : 'postAuthor'
        }),
        comments : many(PostCommentTable),
        likes : many(LikesTable)
    }
});

export const CommentTableRelations = relations(CommentTable, ({one, many}) => {
    return {
        author : one(UserTable, {
            fields : [CommentTable.authorId],
            references : [UserTable.id],
            relationName : 'commentAuthor'
        }),
        posts : many(PostCommentTable),
        replies : many(RepliesTable)
    }
});

export const PostCommentTableRelations = relations(PostCommentTable, ({one, many}) => {
    return {
        post : one(PostTable, {
            fields : [PostCommentTable.postId],
            references : [PostTable.id]
        }),
        comment : one(CommentTable, {
            fields : [PostCommentTable.commentId],
            references : [CommentTable.id]
        })
    }
});

export const RepliesTableRelations = relations(RepliesTable, ({one, many}) => {
    return {
        comment : one(CommentTable, {
            fields : [RepliesTable.commentId],
            references : [CommentTable.id]
        })
    }
});

export const LikesTableRelations = relations(LikesTable, ({one, many}) => {
    return {
        post : one(PostTable, {
            fields : [LikesTable.postId],
            references : [PostTable.id]
        }),
        user : one(UserTable, {
            fields : [LikesTable.userId],
            references : [UserTable.id]
        })
    }
})