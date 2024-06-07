import type { Request, Response, NextFunction } from 'express';
import { CatchAsyncError } from '../middlewares/catchAsyncError';
import ErrorHandler from '../utils/errorHandler';
import type { TInferSelectProfileInfo, TInferSelectUser, TUpdatePassword } from '../@types';
import { followUser, searchUsers, updateProfile, updatePassword, updateInfo, usersProfile, followersInfo } from '../services/user.service';

export const searchWithUsername = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { query } = req.params as {query : string};
        const { active } = req.query as {active : string};
        // This is used for filtering users. Users who have logged in within the past 7 days are considered active. The search 
        //engine must utilize Redis. otherwise, PostgreSQL should be used.
        const user = await searchUsers(query, active, req.user!.id);
        res.status(200).json({success: true, user});
        
    } catch (error : any) {
          return next(error);
    }
});

export const follow = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {
    try {
        const { id : userId } = req.params as {id : string};
        const currentUser = req.user?.id;
        const message = await followUser(currentUser!, userId);
        res.status(200).json({ success: true, message });
        
    } catch (error : any) {
          return next(error);
    }
});

export const updateProfileInfo = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {
    
    try {
        const { profilePic, bio, gender } = req.body as TInferSelectProfileInfo;
        const user = req.user as TInferSelectUser;
        const updatedProfile = await updateProfile(profilePic!, bio!, gender, user);
        res.status(200).json({success : true, profile : updatedProfile});

    } catch (error : any) {
          return next(error);
    }
});

export const updateAccountPassword = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { oldPassword, newPassword } = req.body as TUpdatePassword;
        await updatePassword(oldPassword, newPassword, req.user!.id);
        res.status(200).json({success : true, message : 'Password has been updated'});

    } catch (error : any) {
          return next(error);
    }
});

export const updateAccountInfo = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { fullName, username, email } = req.body as TInferSelectUser;
        const userToModify = req.user as TInferSelectUser;
        const user = await updateInfo(fullName, email, username, userToModify);
        res.status(200).json({success : true, user});
        
    } catch (error : any) {
          return next(error);
    }
});

export const userProfile = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const userId = req.user!.id;
        const { profile, followers, following } = await usersProfile(userId);
        res.status(200).json({profile, followers : followers.length, following : following.length});
        
    } catch (error : any) {
          return next(error);
    }
});

export const followers = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const userId = req.user!.id
        const redisKey = `followers:${userId}`;
        const followers = await followersInfo(redisKey, userId);
        res.status(200).json({success : true, followers});

    } catch (error : any) {
          return next(error);
    }
});