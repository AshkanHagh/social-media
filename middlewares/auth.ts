import type { NextFunction, Request, Response } from 'express';
import ErrorHandler from '../utils/errorHandler';
import jwt, { type JwtPayload, type Secret } from 'jsonwebtoken';
import { CatchAsyncError } from './catchAsyncError';
import redis from '../db/redis';
import type { TInferSelectUser } from '../@types';

export const isAuthenticated = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const accessToken = req.cookies.access_token;
        if(!accessToken) return next(new ErrorHandler('Please login to access this resource', 400));

        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN as Secret) as JwtPayload & TInferSelectUser;
        if(!decoded) return next(new ErrorHandler('Access token is not valid', 400));

        const user = await redis.get(`user:${decoded.id}`);
        if(!user) return next(new ErrorHandler('Please login to access this resource', 400));

        req.user = JSON.parse(user);
        next();

    } catch (error : any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export const authorizeRoles = (...role : string[]) => {
    return (req : Request, res : Response, next : NextFunction) => {
        if(!role.includes(req.user?.role || '')) {
            return next(new ErrorHandler(`Role : ${req.user?.role} is not allowed to access this resource`, 400));
        }
        next();
    }
}