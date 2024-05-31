import type { Request, Response, NextFunction } from 'express';
import { CatchAsyncError } from '../middlewares/catchAsyncError';
import ErrorHandler from '../utils/errorHandler';
import { validateLogin, validateRegister, validateVerifyAccount } from '../validations/Joi';
import type { TActivationRequest, TInferInsertUser, TInferSelectUser } from '../@types';
import { db } from '../db/db';
import redis from '../db/redis';
import bcrypt from 'bcrypt';
import createActivationToken from '../utils/activationToken';
import sendEmail from '../utils/sendMail';
import jwt, { type JwtPayload, type Secret } from 'jsonwebtoken';
import { UserTable } from '../db/schema';
import { accessTokenOption, refreshTokenOption, sendToken } from '../utils/jwt';

export const register = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const {error, value} = validateRegister(req.body);
        if(error) return next(new ErrorHandler(error.message, 400));
        const { fullName, email, username, password } = value as TInferInsertUser;

        const isUserExists = await db.query.UserTable.findFirst({
            where : (table, funcs) => funcs.or(funcs.eq(table.email, email), funcs.eq(table.username, username))
        });
        if(isUserExists) return next(new ErrorHandler('Email or Username already exists', 400));

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = {fullName, email, username, password : hashedPassword} as TInferSelectUser

        const activationToken = createActivationToken(user);
        const activationCode = activationToken.activationCode;

        await sendEmail({
            email: user.email,
            subject: 'Activate Your Account',
            text: 'Please use the following code to activate your account: ' + activationCode,
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2 style="color: #4CAF50;">Activate Your Account</h2>
                <p>Please use the following code to activate your account:</p>
                <div style="border: 1px solid #ddd; padding: 10px; font-size: 20px; margin-top: 20px; text-align: center;">
                  <strong>${activationCode}</strong>
                </div>
                <p>If you did not request this code, please ignore this email or contact our support team.</p>
                <p>Best regards,<br>The Support Team</p>
              </div>
            `
          });

          res.status(201).json({success : true, message : 'Please check your email', activationToken : activationToken.token});
        
    } catch (error : any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export const verifyAccount = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const {error, value} = validateVerifyAccount(req.body);
        if(error) return next(new ErrorHandler(error.message, 400));
        const { activationToken, activationCode } = value as TActivationRequest;

        const newUser : {user : TInferSelectUser, activationCode : string} = jwt.verify(activationToken, process.env.ACTIVATION_TOKEN as Secret) as
        {user : TInferSelectUser, activationCode : string}
        if(newUser.activationCode !== activationCode) return next(new ErrorHandler('Invalid verify code', 400));
        
        const { fullName, email, username, password } = newUser.user;

        const isUserExists = await db.query.UserTable.findFirst({
            where : (table, funcs) => funcs.or(funcs.eq(table.email, email), funcs.eq(table.username, username))
        });
        if(isUserExists) return next(new ErrorHandler('Email or Username already exists', 400));

        await db.insert(UserTable).values({fullName, email, username, password});

        res.status(200).json({success : true, message : 'You can login now'});

    } catch (error : any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export const login = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const {error, value} = validateLogin(req.body);
        if(error) return next(new ErrorHandler(error.message, 400));
        const {email, password} = value as TInferSelectUser;

        const user = await db.query.UserTable.findFirst({where : (table, funcs) => funcs.eq(table.email, email)}) as TInferSelectUser;
        const isPasswordMatch = await bcrypt.compare(password, user?.password || '');
        if(!user || !isPasswordMatch) return next(new ErrorHandler('Invalid email or password', 400));

        sendToken(user, 200, res);
        
    } catch (error : any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export const logout = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        res.cookie('access_token', '', {maxAge : 1});
        res.cookie('refresh_token', '', {maxAge : 1});

        await redis.del(`user:${req.user?.id}`);
        res.status(200).json({success : true, message : 'Logged out successfully'});

    } catch (error : any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export const refreshToken = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const refresh_token = req.cookies.refresh_token;
        const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as Secret) as JwtPayload & TInferSelectUser;
        if(!decoded) return next(new ErrorHandler('Please login to access this resource', 400));

        const session = await redis.get(`user:${decoded.id}`);
        if(!decoded) return next(new ErrorHandler('Could not refresh token', 400));

        const user : TInferSelectUser = JSON.parse(session!);
        req.user = user;

        const accessToken = jwt.sign({id : user.id}, process.env.ACCESS_TOKEN as Secret, {expiresIn : '1h'});
        const refreshToken = jwt.sign({id : user.id}, process.env.REFRESH_TOKEN as Secret, {expiresIn : '7d'});

        res.cookie('access_token', accessToken, accessTokenOption);
        res.cookie('refresh_token', refreshToken, refreshTokenOption);

        await redis.set(`user:${user.id}`, JSON.stringify(user), 'EX', 604800);
        res.status(200).json({success : true, accessToken});

    } catch (error : any) {
        return next(new ErrorHandler(error.message, 400));
    }
});