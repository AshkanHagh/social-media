import type { Request, Response, NextFunction } from 'express';
import { CatchAsyncError } from '../middlewares/catchAsyncError';
import ErrorHandler from '../utils/errorHandler';
import redis from '../db/redis';
import type { TInferSelectProfileInfo, TInferSelectUser, TInferSelectUserWithoutPassword, TUpdatePassword } from '../@types';
import bcrypt from 'bcrypt';
import { searchUserWithUsername, findFirstFollower, findFirstProfileInfo, insertProfileInfo, updateProfileInformation, combineResultsUserInfoAndProfile,
    newFollow, unFollow, updateFollowerInfo, updateAccount, findFirstUserWithEmailOrId, findFirstUserWithRelations, findManyFollowersWithRelations,
    updateUserRedisProfile, sendMailForPasswordChanged, findManyUserFollowers, } from '../services/user.service';
import { BadRequestError, EmailOrUsernameExistsError, InternalServerError, ResourceNotFoundError, UpdateFollowerInfoError, UserNotFoundError 
    } from '../utils/customErrors';
import { hashPassword } from '../services/auth.service';

export const searchWithUsername = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { query } = req.params as {query : string};
        const { active } = req.query as {active : string};
        // This is used for filtering users. Users who have logged in within the past 7 days are considered active. The search 
        //engine must utilize Redis. otherwise, PostgreSQL should be used.
        
        const regexp = new RegExp(query, 'i');
        const matchedUsers : TInferSelectUser[] = [];
        let cursor = '0';

        if(active == 'OK') {
            do {
                const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'user:*', 'COUNT', 100);
                for (const key of keys) {
                    const userRaw = await redis.hgetall(key);
                    const user = userRaw as unknown as TInferSelectUser
                    if(regexp.test(user.username)) {
                        matchedUsers.push(user);
                    }
                }
                cursor = newCursor;
            } while (cursor !== '0');

            if(matchedUsers.length < 0) return next(new UserNotFoundError());
            const filteredUsers = matchedUsers.filter(user => user.id !== req.user?.id);
            return res.status(200).json({success : true, user : filteredUsers});
        }

        const searchedUser = await searchUserWithUsername(query);
        const filteredUsers = searchedUser.filter(user => user.id !== req.user?.id);
        res.status(200).json({success: true, user: filteredUsers});
        
    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});

export const follow = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { id : userId } = req.params as {id : string};
        const currentUser = req.user?.id;
        let userToModify : TInferSelectUserWithoutPassword | null;

        const userRaw = await redis.hgetall(`user:${userId}`);
        userToModify = userRaw as unknown as TInferSelectUser;

        if(userToModify === null) userToModify = await findFirstUserWithEmailOrId({id : userId});
        if(userToModify?.id === currentUser) return next(new BadRequestError());

        const isUserFollowed = await findFirstFollower(currentUser as string, userId);
        if(!isUserFollowed) {
            await newFollow(currentUser as string, userId, res);
            return;
        }
        await unFollow(currentUser as string, userId, res);
        
    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});

export const updateProfileInfo = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { profilePic, bio, gender } = req.body as TInferSelectProfileInfo;

        const user = req.user as TInferSelectUser;
        const profile = await findFirstProfileInfo(user.id);
        if(!profile) {
            const profile = await insertProfileInfo(bio!, profilePic!, gender!, user.id);
            res.status(200).json({success : true, profile});
        }
        const updateValue = {bio : bio || profile.bio, profilePic : profilePic || profile.profilePic, gender : gender || profile.gender, id : user.id}
        const updatedProfile = await updateProfileInformation(updateValue);
        updateUserRedisProfile(user, updatedProfile!);

        res.status(200).json({success : true, profile : updatedProfile});
        
    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});

export const updateAccountPassword = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { oldPassword, newPassword } = req.body as TUpdatePassword;

        const user = await findFirstUserWithEmailOrId({id : req.user!.id}) as TInferSelectUser;
        const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
        if(!isPasswordMatch) return next(new ErrorHandler('The old password is incorrect. Please try again.', 400));

        const password = await hashPassword(newPassword);
        await updateAccount({password, id : user.id});
        sendMailForPasswordChanged(user.email);

        res.status(200).json({success : true, message : 'Password has been updated'});

    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});

export const updateAccountInfo = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { fullName, username, email } = req.body as TInferSelectUser;
        const userToModify = req.user as TInferSelectUser;

        const isUserExists = await findFirstUserWithEmailOrId({email, username, id : userToModify.id});
        if(isUserExists) return next(new EmailOrUsernameExistsError());

        const updateValue = {id : userToModify.id, fullName : fullName || userToModify.fullName, email : email || userToModify.email,
            username : username || userToModify.username
        };
        const updateInfo = await updateAccount(updateValue);
        const {password, ...others} = updateInfo as TInferSelectUser

        updateFollowerInfo(others).catch(error => {return next(new UpdateFollowerInfoError(error.message))});
        await redis.hset(`user:${userToModify.id}`, others);
        await redis.expire(`user:${userToModify.id}`, 604800);
        
        res.status(200).json({success : true, others});
        
    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});

export const userProfile = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const userId = req.user?.id;
        const user = await findFirstUserWithRelations(userId!);

        const follow = await findManyUserFollowers(userId!);
        const following = follow.filter(follow => follow.followerId?.includes(userId!));
        const followers = follow.filter(follow => follow.followedId?.includes(userId!));
        const profileInfo = user?.profileInfo as TInferSelectProfileInfo;

        const profile = combineResultsUserInfoAndProfile(user as TInferSelectUser, profileInfo);
        res.status(200).json({profile, followers : followers.length, following : following.length});
        
    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});

export const followers = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const userId = req.user?.id
        const redisKey = `followers:${userId}`;

        const cachedFollowers = await redis.hgetall(redisKey);
        const cachedFollowersArray = Object.values(cachedFollowers);
        if(cachedFollowersArray.length > 0) {

            const followersList = cachedFollowersArray.map(follow => JSON.parse(follow));
            return res.status(200).json({success : true, followers : followersList});
        }

        const followers = await findManyFollowersWithRelations(userId!);
        if(followers.length <= 0) return next(new ResourceNotFoundError());

        const mappedFollowers = followers.map(followers => {
            const follower = followers.follower;
            return {id : follower?.id, username : follower?.username, profilePic : follower?.profileInfo?.profilePic}
        });
        const followerEntries = mappedFollowers.filter(follow => follow.id !== undefined).flatMap(follow => [follow.id as string, 
        JSON.stringify(follow)]);
        await redis.hmset(redisKey, ...followerEntries);

        res.status(200).json({success : true, followers : mappedFollowers});

    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});