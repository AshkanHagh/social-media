import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { CommentTable, FollowersTable, FollowingTable, LikesTable, PostTable, ProfileInfoTable, RepliesTable, UserTable } from '../db/schema';
import { PgTable, TableConfig } from 'drizzle-orm/pg-core';

type TErrorHandler = {
    statusCode : Number
    message : string
}

type TInferSelectUser = InferSelectModel<typeof UserTable>

type TInferSelectProfileInfo = InferSelectModel<typeof ProfileInfoTable>

type TInferSelectFollowers = InferSelectModel<typeof FollowersTable>

type TInferSelectPost = InferSelectModel<typeof PostTable>

type TInferSelectComment = InferSelectModel<typeof CommentTable>

type TInferSelectReplies = InferSelectModel<typeof RepliesTable>

type TInferSelectLike = InferSelectModel<typeof LikesTable>

type TInferSelectUserWithoutPassword = Omit<TInferSelectUser, 'password'>

declare global {
    namespace Express {
        interface Request {
            user? : TInferSelectUser
        }
    }
}

type TFollowerProfileInfo = {
    id: TInferSelectUser['id'];
    username: TInferSelectUser['username'];
    profilePic: TInferSelectProfileInfo['profilePic'];
}

type TProfileUpdateInfo = {
    bio: TInferSelectProfileInfo['bio'];
    profilePic: TInferSelectProfileInfo['profilePic'];
    gender: TInferSelectProfileInfo['gender'];
    id: TInferSelectUser['id'];
}

type TUpdateAccountOptions = {
    id : TInferSelectUser['id']
    fullName? : TInferSelectUser['fullName'],
    email? : TInferSelectUser['email'],
    username? : TInferSelectUser['username'],
    password? : TInferSelectUser['password'],
}

type TFindFirstOptions = {
    id? : TInferSelectUser['id']
    email? : TInferSelectUser['email'],
    username? : TInferSelectUser['username'],
}

type TFindUserWithProfileInfo = {
    id: TInferSelectUser['id']
    fullName : TInferSelectUser['fullName']
    username : TInferSelectUser['username']
    email : TInferSelectUser['email']
    role : TInferSelectUser['role']
    password : TInferSelectUser['password']
    createdAt : TInferSelectUser['createdAt']
    updatedAt : TInferSelectUser['updatedAt']
    profileInfo : {
        userId : TInferSelectProfileInfo['userId']
        bio : TInferSelectProfileInfo['bio']
        profilePic : TInferSelectProfileInfo['profilePic']
        account_status : TInferSelectProfileInfo['account_status']
        gender : TInferSelectProfileInfo['gender']
    }
}

type TFindPostWithAuthor = {
    id : TInferSelectPost['id']
    text : TInferSelectPost['text']
    authorId : TInferSelectPost['authorId']
    createdAt : TInferSelectPost['createdAt']
    updatedAt : TInferSelectPost['updatedAt']
    image : TInferSelectPost['image']
    author : {
        fullName : TInferSelectUser['fullName']
        username : TInferSelectUser['username']
        email : TInferSelectUser['email']
        role : TInferSelectUser['role']
    }
}

type TQueryTable<T> = PgTable<TableConfig> & {
    findMany : (query : { with? : Record<string, boolean>, limit? : number, offset? : number }) => Promise<T[]>
};

type TInsertInfoRedis = {
    profile? : TInferSelectProfileInfo
    follower? : TInferSelectFollowers
    post? : TInferSelectPost
    comment? : TInferSelectComment
    replies? : TInferSelectReplies
    like? : TInferSelectLike
    user? : TInferSelectUserWithoutPassword
    userWithProfilePic? : TUserAndProfile
}

type TPagination = {
    next? : {page : number, limit : number},
    previous? : {page : number,limit : number},
    result : unknown[]
}

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

type TTokenPair = {
    accessToken: string;
    refreshToken: string;
}

type TTokenOptions = {
    accessTokenOption: TCookieOption;
    refreshTokenOption: TCookieOption;
}