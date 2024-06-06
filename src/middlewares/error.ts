import type { NextFunction, Request, Response } from 'express';
import type { TErrorHandler } from '../@types';
import ErrorHandler from '../utils/errorHandler';

export const ErrorMiddleware = (error: TErrorHandler, req: Request, res: Response, next: NextFunction) => {
    error.statusCode = error.statusCode || 500;
    error.message = error.statusCode == 500 ? 'Internal server error' : error.message;

    res.status(Number(error.statusCode)).json({ message: error.message });
}