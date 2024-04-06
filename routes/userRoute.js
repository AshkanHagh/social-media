import express from 'express';
import { followUnFollowUser, getUserProfile, login, logout, signup, updateUser } from '../controllers/userController.js';
import protectRouter from '../middleware/protectRoute.js';

const router = express.Router();

router.get('/profile/:username', getUserProfile)

router.post('/signup', signup);

router.post('/login', login);

router.post('/logout', logout);

router.post('/follow/:id', protectRouter, followUnFollowUser);

router.put('/update/:id', protectRouter, updateUser);


export default router;