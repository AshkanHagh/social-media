import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth';
import { createPost, deletePost, likePost, posts, singlePost } from '../controllers/post.controller';
import { deleteSingleComment, editComment, getComments, newComment } from '../controllers/comment.controller';
import validationMiddleware from '../middlewares/validation.middleware';
import { newCommentSchema, newPostSchema, replaySchema, updatedCommentText } from '../validations/Joi';

const router = Router();

// Comments route
router.post('/comment/:id', [isAuthenticated, validationMiddleware(newCommentSchema)], newComment);

router.get('/comment/:id', getComments);

router.patch('/comment/:id', [isAuthenticated, validationMiddleware(updatedCommentText)], editComment);

router.delete('/comment/:id', isAuthenticated, deleteSingleComment);

// Posts route
router.get('/:id', singlePost);

router.get('/', posts);

router.post('/new', [isAuthenticated, validationMiddleware(newPostSchema)], createPost);

router.put('/like/:id', isAuthenticated, likePost);

router.delete('/:id', isAuthenticated, deletePost);

export default router;