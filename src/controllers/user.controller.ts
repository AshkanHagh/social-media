import type { Request, Response, NextFunction } from 'express';
import { CatchAsyncError } from '../middlewares/catchAsyncError';
import ErrorHandler from '../utils/errorHandler';
import redis from '../db/redis';
import type { TInferInsertProfileInfo, TInferSelectProfileInfo, TInferSelectUser, TInferSelectUserWithoutPassword, TUpdatePassword 
} from '../@types';
import { db } from '../db/db';
import bcrypt from 'bcrypt';
import sendEmail from '../utils/sendMail';
import { searchUserWithUsername, findFirstFollower, findFirstProfileInfo, insertProfileInfo, updateAccountInformation, combineResultsUserInfoAndProfile,
    newFollow, unFollow, updateFollowerInfo, updateAccount, findFirstUserWithEmailOrId,
    findFirstUserWithRelations,
    findManyFollowersWithRelations,
} from '../services/user.service';
import { BadRequestError, EmailOrUsernameExistsError, InternalServerError, InvalidUserIdError, UpdateFollowerInfoError, UserNotFoundError, ValidationError } from '../utils/customErrors';
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
                    const data : string | null = await redis.get(key);
                    const user : TInferSelectUser = JSON.parse(data!);
                    if(regexp.test(user.username)) {
                        matchedUsers.push(user);
                    }
                }
                cursor = newCursor;
            } while (cursor !== '0');

            if(matchedUsers.length < 0) return next(new UserNotFoundError());
            return res.status(200).json({success : true, user : matchedUsers});
        }

        const searchedUser : TInferSelectUserWithoutPassword[] | null = await searchUserWithUsername(query);
        res.status(200).json({success: true, user: searchedUser});
        
    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});

export const follow = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { id : userId } = req.params as {id : string};
        const currentUser = req.user?.id;
        let userToModify : TInferSelectUserWithoutPassword | null;

        const data : string | null = await redis.get(`user:${userId}`);
        userToModify = userToModify = JSON.parse(data!);

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
        const { profilePic, bio, gender } = req.body as TInferInsertProfileInfo;

        const user = req.user as TInferSelectUser;
        const profile = await findFirstProfileInfo(user.id);
        if(!profile) {
            const profile = await insertProfileInfo(bio!, profilePic!, gender!, user.id);
            res.status(200).json({success : true, profile});
        }
        const updateValue = {bio : bio || profile.bio, profilePic : profilePic || profile.profilePic, gender : gender || profile.gender, id : user.id}
        const updatedProfile = await updateAccountInformation(updateValue);
        const combineResult = combineResultsUserInfoAndProfile(user, updatedProfile as TInferSelectProfileInfo);
        await redis.set(`user:${user.id}`, JSON.stringify(combineResult), 'EX', 604800);

        res.status(200).json({success : true, profile : combineResult, updatedProfile});
        
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

        await sendEmail({
            email: user.email,
            subject: 'Password Changed Successfully',
            text: 'Your password has been successfully updated.',
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2 style="color: #4CAF50;">Password Changed Successfully</h2>
                <p>Your password has been successfully updated. If you did not initiate this change, please contact our support team immediately.</p>
                <p>If you have any questions, please feel free to contact us.</p>
                <p>Best regards,<br>The Support Team</p>
              </div>
            `
        });

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
        await redis.set(`user:${userToModify.id}`, JSON.stringify(others), 'EX', 604800);
        
        res.status(200).json({success : true, others});
        
    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});

export const userProfile = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const userId = req.user?.id;
        const user = await findFirstUserWithRelations(userId!);

        const follow = await db.query.FollowersTable.findMany({
            where : (table, funcs) => funcs.or(funcs.eq(table.followedId, userId!), funcs.eq(table.followerId, userId!))
        });
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

        const mappedFollowers = followers.map(followers => {
            const follower = followers.follower;
            return {
                id : follower?.id, username : follower?.username, profilePic : follower?.profileInfo?.profilePic
            }
        });
        const followerEntries = mappedFollowers.filter(follow => follow.id !== undefined).flatMap(follow => [follow.id as string, 
        JSON.stringify(follow)]);
        await redis.hmset(redisKey, ...followerEntries);

        res.status(200).json({success : true, followers : mappedFollowers});

    } catch (error : any) {
        return next(new InternalServerError(`An error occurred: ${error.message}`));
    }
});