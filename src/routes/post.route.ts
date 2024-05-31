import { Router } from 'express';
import { authorizeRoles, isAuthenticated } from '../middlewares/auth';
import { createPost, likePost, posts, singlePost } from '../controllers/post.controller';
import { newComment } from '../controllers/comment.controller';

const router = Router();

// Comments route
router.post('/comment/new/:id', isAuthenticated, newComment);

// Like route
router.put('/like/:id', isAuthenticated, likePost);

// Posts route
router.post('/new', [isAuthenticated, authorizeRoles('admin')],createPost);

router.get('/:id', isAuthenticated, singlePost);

router.get('/', isAuthenticated, posts);

export default router;