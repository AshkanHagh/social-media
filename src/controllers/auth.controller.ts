import type { Request, Response, NextFunction } from 'express';
import { CatchAsyncError } from '../middlewares/catchAsyncError';
import type { TActivationRequest, TInferSelectUser } from '../@types';
import { sendToken } from '../utils/jwt';
import { loginUserService, refreshTokenService, registerService, verifyUserService } from '../services/auth.service';
import { deleteCache } from '../db/redis-query';

export const register = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { fullName, email, username, password } = req.body as TInferSelectUser;
        const token = await registerService(fullName, email, username, password);

        res.status(201).json({success : true, message : 'Please check your email', activationToken : token});
        
    } catch (error) {
          return next(error);
    }
});

export const verifyAccount = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { activationToken, activationCode } = req.body as TActivationRequest;
        await verifyUserService(activationCode, activationToken);
        res.status(200).json({success : true, message : 'You can login now'});

    } catch (error) {
          return next(error);
    }
});

export const login = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { email, password } = req.body as TInferSelectUser;
        const user = await loginUserService(email, password);

        const { accessToken, others } = sendToken(user, res, 'login');
        res.status(200).json({success : true, user : others, accessToken});
        
    } catch (error) {
          return next(error);
    }
});

export const logout = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        res.cookie('access_token', '', {maxAge : 1});
        res.cookie('refresh_token', '', {maxAge : 1});

        await deleteCache(`user:${req.user!.id}`);
        res.status(200).json({success : true, message : 'Logged out successfully'});

    } catch (error) {
          return next(error);
    }
});

export const refreshToken = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const refresh_token = req.cookies.refresh_token as string;
        const user = await refreshTokenService(refresh_token) as unknown as TInferSelectUser;
        req.user = user ;

        const { accessToken } = sendToken(user, res, 'refresh');
        res.status(200).json({success : true, accessToken});

    } catch (error) {
          return next(error);
    }
});