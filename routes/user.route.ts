import { Router } from 'express';
import { login, logout, refreshToken, register, verifyAccount } from '../controllers/auth.controller';

const router = Router();

// authentication
router.post('/auth/register', register);

router.post('/auth/verify', verifyAccount);

router.post('/auth/login', login);

router.get('/logout', logout);

router.get('/refresh', refreshToken);

export default router;