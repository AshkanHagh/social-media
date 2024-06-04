import type { NextFunction, Request, Response } from 'express';
import ErrorHandler from '../utils/errorHandler';
import jwt, { type JwtPayload, type Secret } from 'jsonwebtoken';
import { CatchAsyncError } from './catchAsyncError';
import redis from '../db/redis';
import type { TInferSelectUser } from '../@types';
import { AccessTokenInvalidError, InternalServerError, LoginRequiredError, RoleForbiddenError } from '../utils/customErrors';

export const isAuthenticated = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const accessToken = req.cookies.access_token;
        if(!accessToken) return next(new LoginRequiredError());

        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN as Secret) as JwtPayload & TInferSelectUser;
        if(!decoded) return next(new AccessTokenInvalidError());

        const userRaw = await redis.hgetall(`user:${decoded.id}`);
        if(!userRaw) return next(new LoginRequiredError());

        const user = userRaw as unknown as TInferSelectUser;
        req.user = user;
        next();

    } catch (error : any) {
        return next(new InternalServerError());
    }
});

export const authorizeRoles = (...role : string[]) => {
    return (req : Request, res : Response, next : NextFunction) => {
        if(!role.includes(req.user?.role || '')) {
            return next(new RoleForbiddenError(req.user?.role || 'unknown'));
        }
        next();
    }
}