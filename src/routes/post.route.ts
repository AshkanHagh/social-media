import { Router } from 'express';
import { authorizeRoles, isAuthenticated } from '../middlewares/auth';
import { createPost, likePost, posts, singlePost } from '../controllers/post.controller';
import { newComment } from '../controllers/comment.controller';

const router = Router();

// Comments route
router.post('/comment/new/:id', isAuthenticated, newComment);

// Posts route
router.get('/:id', singlePost);

router.get('/', posts);

router.post('/new', isAuthenticated, createPost);

router.put('/like/:id', isAuthenticated, likePost);

export default router;