import type { FollowsTable, PostTable, UserTable } from '../db/schema';


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

type TInferSelectFollows = typeof FollowsTable.$inferSelect
type TInferInsertFollows = typeof FollowsTable.$inferInsert

type TInferSelectPost = typeof PostTable.$inferSelect
type TInferInsertPost = typeof PostTable.$inferInsert

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