import type { NextFunction, Request, Response } from 'express';
import type { TErrorHandler } from '../@types';
import ErrorHandler from '../utils/errorHandler';

export const ErrorMiddleware = (error: TErrorHandler, req: Request, res: Response, next: NextFunction) => {
    error.statusCode = error.statusCode || 500;
    error.message = error.message || 'Internal server error';

    res.status(Number(error.statusCode)).json({ message: error.message });
}