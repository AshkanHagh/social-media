import type { NextFunction, Request, Response } from 'express';
import ErrorHandler from '../utils/errorHandler';
import type { IError } from '../types';

export const ErrorMiddleware = (error : IError, req : Request, res : Response, next : NextFunction) => {

    error.statusCode = error.statusCode || 500;
    error.message = error.message || 'Internal server error';

    res.status(Number(error.statusCode)).json({message : error.message});
}