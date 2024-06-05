import { Router } from 'express';
import { authorizeRoles, isAuthenticated } from '../middlewares/auth';
import { createPost, deletePost, likePost, posts, singlePost } from '../controllers/post.controller';
// import { newComment } from '../controllers/comment.controller';
import validationMiddleware from '../middlewares/validation.middleware';
import { newCommentSchema, newPostSchema } from '../validations/Joi';

const router = Router();

// Comments route
// router.post('/comment/new/:id', [isAuthenticated, validationMiddleware(newCommentSchema)], newComment);

// Posts route
router.get('/:id', singlePost);

router.get('/', posts);

router.post('/new', [isAuthenticated, validationMiddleware(newPostSchema)], createPost);

router.put('/like/:id', isAuthenticated, likePost);

router.delete('/:id', isAuthenticated, deletePost);

export default router;