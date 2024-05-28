import type { FollowersTable, FollowingTable, UserProfileInfoTable, UserTable } from '../db/schema';


type TMailOption = {
    subject : string
    text : string
    email : string
    html : string
}

type TErrorHandler = {
    statusCode : Number
    message : string
}

type TInferSelectUser = typeof UserTable.$inferSelect
type TInferInsertUser = typeof UserTable.$inferInsert

type TInferSelectUserProfileInfo = typeof UserProfileInfoTable.$inferSelect
type TInferInsertUserProfileInfo = typeof UserProfileInfoTable.$inferInsert

type TInferSelectFollowers = typeof FollowersTable.$inferSelect
type TInferInsertFollowers = typeof FollowersTable.$inferInsert

type TInferSelectFollowing = typeof FollowingTable.$inferSelect
type TInferInsertFollowing = typeof FollowingTable.$inferInsert

declare global {
    namespace Express {
        interface Request {
            user? : TInferSelectUser
        }
    }
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