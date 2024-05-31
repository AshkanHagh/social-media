import { Router, type NextFunction, type Request, type Response } from 'express';
import { login, logout, refreshToken, register, verifyAccount } from '../controllers/auth.controller';
import { follow, searchWithUsername, updateAccountInfo, updateAccountPassword, updateProfileInfo } from '../controllers/user.controller';
import { isAuthenticated } from '../middlewares/auth';

const router = Router();

// Authentication Routes
router.post('/auth/register', register);

router.post('/auth/verify', verifyAccount);

router.post('/auth/login', login);

router.get('/logout', logout);

router.get('/refresh', refreshToken);

// User Routes
router.get('/search/:query', searchWithUsername);

router.put('/follow/:id', isAuthenticated, follow);

// Account Info Routes
router.patch('/account/profile', isAuthenticated, updateProfileInfo);

router.patch('/account/password', isAuthenticated, updateAccountPassword);

router.patch('/account/info', isAuthenticated, updateAccountInfo);

router.all('*', (req : Request, res : Response, next : NextFunction) => {
    const error = new Error(`Route ${req.originalUrl} not found`);
    next(error);
});

export default router;