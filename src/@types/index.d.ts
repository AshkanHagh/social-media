import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { CommentTable, FollowersTable, FollowingTable, LikesTable, PostTable, ProfileInfoTable, RepliesTable, 
    UserTable } from '../db/schema';

type TErrorHandler = {
    statusCode : Number
    message : string
}

type TInferSelectUser = InferSelectModel<typeof UserTable>
type TInferInsertUser = InferInsertModel<typeof UserTable>

type TInferSelectProfileInfo = InferSelectModel<typeof ProfileInfoTable>
type TInferInsertProfileInfo = InferInsertModel<typeof ProfileInfoTable>

type TInferSelectFollowers = InferSelectModel<typeof FollowersTable>
type TInferInsertFollowers = InferInsertModel<typeof FollowersTable>

type TInferSelectPost = InferSelectModel<typeof PostTable>
type TInferInsertPost = InferInsertModel<typeof PostTable>

type TInferSelectComment = InferSelectModel<typeof CommentTable>
type TInferInsertComment = InferInsertModel<typeof CommentTable>

type TInferSelectReplies = InferSelectModel<typeof RepliesTable>
type TInferInsertReplies = InferInsertModel<typeof RepliesTable>

type TInferSelectLike = InferSelectModel<typeof LikesTable>
type TInferInsertLike = InferInsertModel<typeof LikesTable>

declare global {
    namespace Express {
        interface Request {
            user? : TInferSelectUser
        }
    }
}

type TMapPost = {
    id : TInferSelectPost['id'],
    text : TInferSelectPost['text']
    image : TInferSelectPost['image']
    authorId : TInferSelectUser['id']
    createdAt : TInferSelectPost['createdAt']
    updatedAT : TInferSelectPost['updatedAt']
}

type TFixedPostResult = {
    id: TInferSelectPost['id']
    text: TInferSelectPost['text']
    image: TInferSelectPost['image']
    createdAt: TInferSelectPost['createdAt']
    updatedAt: TInferSelectPost['updatedAt']
    author: TInferSelectUser;
    comments: {
        comment : {
            id : TInferSelectComment['id'],
            text : TInferSelectComment['text'],
            authorId : TInferSelectUser['id'],
            createdAt : TInferSelectComment['createdAt'],
            updatedAt : TInferSelectComment['updatedAt']
        }
    }[];
    likes: {
        user : {
            id : TInferSelectUser['id'],
            username : TInferSelectUser['username']
        }
    }[];
};

type TMailOption = {
    subject : string
    text : string
    email : TInferSelectUser['email']
    html : string
}

type TUpdatePassword = {
    oldPassword : TInferSelectUser['password'];
    newPassword : TInferSelectUser['password'];
}

type TActivationToken = {
    token : string
    activationCode : string
}

type TActivationRequest = {
    activationToken : string
    activationCode : string
}

type TCookieOption = {
    expires : Date
    maxAge : number
    httpOnly : boolean
    sameSite : 'lax' | 'strict' | 'none' | undefined
    secure? : boolean
}