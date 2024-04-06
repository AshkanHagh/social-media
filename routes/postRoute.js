import express from 'express';
import { createPost, deletePost, getFeedPosts, getPosts, likeUnLikePost, replayToPost } from '../controllers/postController.js';
import protectRouter  from '../middleware/protectRoute.js';

const router = express.Router();

router.get('/feed', protectRouter, getFeedPosts);

router.get('/:id', getPosts);

router.post('/create', protectRouter, createPost);

router.delete('/:id', protectRouter, deletePost);

router.post('/like/:id', protectRouter, likeUnLikePost);

router.post('/reply/:id', protectRouter, replayToPost);

export default router;