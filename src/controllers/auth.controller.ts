import type { Request, Response, NextFunction } from 'express';
import { CatchAsyncError } from '../middlewares/catchAsyncError';
import type { TActivationRequest, TInferSelectUser, TInferSelectUserWithoutPassword } from '../@types';
import redis from '../db/redis';
import bcrypt from 'bcrypt';
import createActivationToken from '../utils/activationToken';
import jwt, { type JwtPayload, type Secret } from 'jsonwebtoken';
import { sendToken } from '../utils/jwt';
import { EmailOrUsernameExistsError, InternalServerError, InvalidEmailOrPasswordError, InvalidVerifyCode, LoginRequiredError, TokenRefreshError 
} from '../utils/customErrors';
import { hashPassword, insertUser, sendMailForAuth } from '../services/auth.service';
import { findFirstUserWithEmailOrId } from '../services/user.service';

export const register = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { fullName, email, username, password } = req.body as TInferSelectUser;

        const isUserExists = await findFirstUserWithEmailOrId({username, email});
        if(isUserExists) return next(new EmailOrUsernameExistsError());

        const hashedPassword = await hashPassword(password);
        const user = {fullName, email, username, password : hashedPassword} as TInferSelectUser

        const activationToken = createActivationToken(user);
        const activationCode = activationToken.activationCode;
        sendMailForAuth(email, activationCode);

        res.status(201).json({success : true, message : 'Please check your email', activationToken : activationToken.token});
        
    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});

export const verifyAccount = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { activationToken, activationCode } = req.body as TActivationRequest;

        const newUser : {user : TInferSelectUser, activationCode : string} = jwt.verify(activationToken, process.env.ACTIVATION_TOKEN as Secret) as
        {user : TInferSelectUser, activationCode : string}
        if(newUser.activationCode !== activationCode) return next(new InvalidVerifyCode());
        
        const { fullName, email, username, password } = newUser.user;

        const isUserExists = await findFirstUserWithEmailOrId({username, email});
        if(isUserExists) return next(new EmailOrUsernameExistsError());
        insertUser(fullName, email, username, password);

        res.status(200).json({success : true, message : 'You can login now'});

    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});

export const login = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const {email, password} = req.body as TInferSelectUser;

        const user = await findFirstUserWithEmailOrId({email}) as TInferSelectUser;
        const isPasswordMatch = await bcrypt.compare(password, user?.password || '');
        if(!user || !isPasswordMatch) return next(new InvalidEmailOrPasswordError());

        sendToken(user, 200, res, 'login');
        
    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});

export const logout = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        res.cookie('access_token', '', {maxAge : 1});
        res.cookie('refresh_token', '', {maxAge : 1});

        await redis.hdel(`user:${req.user?.id}`);
        res.status(200).json({success : true, message : 'Logged out successfully'});

    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});

export const refreshToken = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const refresh_token = req.cookies.refresh_token;
        const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as Secret) as JwtPayload & TInferSelectUser;
        if(!decoded) return next(new LoginRequiredError());

        const session = await redis.hgetall(`user:${decoded.id}`);
        if(Object.keys(session).length <= 0) return next(new TokenRefreshError());

        const user = session as unknown as TInferSelectUser;
        req.user = user;
        sendToken(user, 200, res, 'refresh');

    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});