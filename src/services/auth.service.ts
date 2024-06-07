import type { TInferSelectUser } from '../@types';
import { insertUser } from '../db/db-query/auth.query'; 
import { findFirstUserWithEmailOrId } from '../db/db-query/user.query'; 
import { eventEmitter } from '../events/user.subscriptions'; 
import createActivationToken from '../utils/activationToken'; 
import { EmailOrUsernameExistsError, InvalidEmailOrPasswordError, InvalidVerifyCode, LoginRequiredError, TokenRefreshError } 
from '../utils/customErrors'
import { hashPassword } from '../utils/hashPassword'; 
import jwt, { type JwtPayload, type Secret } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { findInCache } from '../db/redis-query'; 
import ErrorHandler from '../utils/errorHandler';

export const registerService = async (fullName : string, email : string, username : string, password : string) => {
    try {
        const isUserExists = await findFirstUserWithEmailOrId({username, email});
        if(isUserExists) throw new EmailOrUsernameExistsError();

        const hashedPassword = await hashPassword(password);
        const user = {fullName, email, username, password : hashedPassword} as TInferSelectUser

        const { token, activationCode } = createActivationToken(user);
        eventEmitter.emit('register', email, activationCode);
        return token;
        
    } catch (error : any) {
        throw new ErrorHandler(`An error occurred: ${error.message}`, error.statusCode);
    }
}

export const verifyUserService = async (activationCode : string, activationToken : string) => {
    try {
        const newUser : {user : TInferSelectUser, activationCode : string} = jwt.verify(activationToken, process.env.ACTIVATION_TOKEN as Secret) as
        {user : TInferSelectUser, activationCode : string}
        if(newUser.activationCode !== activationCode) throw new InvalidVerifyCode();
        
        const { fullName, email, username, password } = newUser.user;

        const isUserExists = await findFirstUserWithEmailOrId({username, email});
        if(isUserExists) throw new EmailOrUsernameExistsError();
        insertUser(fullName, email, username, password);

    } catch (error : any) {
        throw new ErrorHandler(`An error occurred: ${error.message}`, error.statusCode);
    }
}

export const loginUserService = async (email : string, password : string) => {
    try {
        const user = await findFirstUserWithEmailOrId({email}) as TInferSelectUser;

        const isPasswordMatch = await bcrypt.compare(password, user?.password || '');
        if(!user || !isPasswordMatch) throw new InvalidEmailOrPasswordError();
        return user;
        
    } catch (error : any) {
        throw new ErrorHandler(`An error occurred: ${error.message}`, error.statusCode);
    }
}

export const refreshTokenService = async (token : string) => {
    try {
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN as string) as JwtPayload & TInferSelectUser;
        if(!decoded) throw new LoginRequiredError();

        const session : TInferSelectUser = await findInCache(`user:${decoded.id}`);
        if(Object.keys(session).length <= 0) throw new TokenRefreshError();

        const user = session as unknown as TInferSelectUser;
        return user;

    } catch (error : any) {
        throw new ErrorHandler(`An error occurred: ${error.message}`, error.statusCode);
    }
}