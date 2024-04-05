import express from 'express';
import { createPost, deletePost, getPosts, likeUnLikePost, replayToPost } from '../controllers/postController.js';
import protectRouter  from '../middleware/protectRoute.js';

const router = express.Router();

router.get('/:id', getPosts);

router.post('/create', protectRouter, createPost);

router.delete('/:id', protectRouter, deletePost);


export default router;