import { Router, type NextFunction, type Request, type Response } from 'express';
import { login, logout, refreshToken, register, verifyAccount } from '../controllers/auth.controller';
import { follow, followers, userProfile, searchWithUsername, updateAccountInfo, updateAccountPassword, 
    updateProfileInfo } from '../controllers/user.controller';
import { isAuthenticated } from '../middlewares/auth';
import validationMiddleware from '../middlewares/validation.middleware';
import { loginSchema, registerSchema, updateInfoSchema, updatePasswordSchema, updateProfileInfoSchema, verifyAccountSchema } from '../validations/Joi';

const router = Router();

// Authentication Routes
router.post('/auth/register', validationMiddleware(registerSchema), register);

router.post('/auth/verify', validationMiddleware(verifyAccountSchema), verifyAccount);

router.post('/auth/login', validationMiddleware(loginSchema), login);

router.get('/logout', logout);

router.get('/refresh', refreshToken);

// User Routes
router.get('/search/:query', isAuthenticated, searchWithUsername);

router.put('/follow/:id', isAuthenticated, follow);

// Account Info Routes
router.get('/account/profile', isAuthenticated, userProfile);

router.patch('/account/profile', [isAuthenticated, validationMiddleware(updateProfileInfoSchema)], updateProfileInfo);

router.patch('/account/password', [isAuthenticated, validationMiddleware(updatePasswordSchema)], updateAccountPassword);

router.patch('/account/info', [isAuthenticated, validationMiddleware(updateInfoSchema)], updateAccountInfo);

router.get('/account/followers', isAuthenticated, followers);

router.all('*', (req : Request, res : Response, next : NextFunction) => {
    const error = new Error(`Route ${req.originalUrl} not found`);
    next(error);
});

export default router;