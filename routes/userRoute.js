import express from 'express';
import { followUnFollowUser, login, logout, signup } from '../controllers/userController.js';
import protectRouter from '../middleware/protectRoute.js';

const router = express.Router();

router.post('/signup', signup);

router.post('/login', login);

router.post('/logout', logout);

router.post('/follow/:id', protectRouter, followUnFollowUser);


export default router;