import express from 'express';
import { createPost, deletePost, getFeedPosts, getPosts, getUsersPosts, likeUnLikePost, replayToPost } from '../controllers/postController.js';
import protectRouter  from '../middleware/protectRoute.js';

const router = express.Router();

router.get('/feed', protectRouter, getFeedPosts);

router.get('/:id', getPosts);

router.get('/user/:username', getUsersPosts);

router.post('/create', protectRouter, createPost);

router.delete('/:id', protectRouter, deletePost);

router.put('/like/:id', protectRouter, likeUnLikePost);

router.put('/reply/:id', protectRouter, replayToPost);

export default router;