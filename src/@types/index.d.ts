import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import type { FollowersTable, FollowingTable, ProfileInfoTable, UserTable } from '../db/schema';


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

type TInferSelectUser = InferSelectModel<typeof UserTable>
type TInferInsertUser = InferInsertModel<typeof UserTable>

type TInferSelectProfileInfo = InferSelectModel<typeof ProfileInfoTable>
type TInferInsertProfileInfo = InferInsertModel<typeof ProfileInfoTable>

type TInferSelectFollowers = InferSelectModel<typeof FollowersTable>
type TInferInsertFollowers = InferInsertModel<typeof FollowersTable>

declare global {
    namespace Express {
        interface Request {
            user? : TInferSelectUser
        }
    }
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