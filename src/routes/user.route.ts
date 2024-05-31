import { Router } from 'express';
import { login, logout, refreshToken, register, verifyAccount } from '../controllers/auth.controller';
import { follow, searchWithUsername, updateAccountPassword, updateProfileInfo } from '../controllers/user.controller';
import { isAuthenticated } from '../middlewares/auth';

const router = Router();

// authentication
router.post('/auth/register', register);

router.post('/auth/verify', verifyAccount);

router.post('/auth/login', login);

router.get('/logout', logout);

router.get('/refresh', refreshToken);

// user
router.get('/search/:query', searchWithUsername);

router.put('/follow/:id', isAuthenticated, follow);

// account info
router.patch('/account/info/:id', isAuthenticated, updateProfileInfo);

router.patch('/account/password/:id', isAuthenticated, updateAccountPassword);

export default router;