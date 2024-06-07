import { Router } from 'express';
import { isAuthenticated } from '../middlewares/auth';
import { createPost, deletePost, getFollowersPost, likePost, posts, singlePost } from '../controllers/post.controller';
import { addReplay, deleteCommentReplay, deleteSingleComment, editComment, editReplay, getComments, getReplies, newComment } from '../controllers/comment.controller';
import validationMiddleware from '../middlewares/validation.middleware';
import { newCommentSchema, newPostSchema } from '../validations/Joi';

const router = Router();

// Comments route
router.post('/comment/:id', [isAuthenticated, validationMiddleware(newCommentSchema)], newComment);

router.get('/comment/:id', getComments);

router.patch('/comment/:id', [isAuthenticated, validationMiddleware(newCommentSchema)], editComment);

router.delete('/comment/:id', isAuthenticated, deleteSingleComment);

// replies
router.post('/replay/:id', [isAuthenticated, validationMiddleware(newCommentSchema)], addReplay);

router.get('/replay/:id', isAuthenticated, getReplies);

router.patch('/replay/:id', [isAuthenticated, validationMiddleware(newCommentSchema)], editReplay);

router.delete('/replay/:replayId/:commentId', isAuthenticated, deleteCommentReplay);

// followersPost
router.get('/followers', isAuthenticated, getFollowersPost);

// Posts route
router.get('/:id', singlePost);

router.get('/', posts);

router.post('/new', [isAuthenticated, validationMiddleware(newPostSchema)], createPost);

router.put('/like/:id', isAuthenticated, likePost);

router.delete('/:id', isAuthenticated, deletePost);


export default router;