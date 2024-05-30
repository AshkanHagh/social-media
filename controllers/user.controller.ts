import type { Request, Response, NextFunction } from 'express';
import { CatchAsyncError } from '../middlewares/catchAsyncError';
import ErrorHandler from '../utils/errorHandler';
import redis from '../db/redis';
import type { TInferInsertProfileInfo, TInferInsertUser, TInferSelectProfileInfo, TInferSelectUser, TUpdatePassword } from '../@types';
import { db } from '../db/db';
import { FollowersTable, ProfileInfoTable, UserTable } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { validatePassword, validateProfileInfo } from '../validation/Joi';
import bcrypt, { hash } from 'bcrypt';
import sendEmail from '../utils/sendMail';

export const searchWithUsername = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { query } = req.params as {query : string};
        const keys = await redis.keys('user:*');

        const fixedQuery = query.replace(/\s+/g, '');
        
        const user = await Promise.all(keys.map(async (key : string) => {
            const data = await redis.get(key);
            const user: TInferSelectUser = JSON.parse(data!);

            if (!user.username.replace(/\s+/g, '').toLowerCase().includes(fixedQuery.toLowerCase())) {
                const username = await db.query.UserTable.findFirst({
                    where : (table, funcs) => funcs.ilike(table.username, fixedQuery)
                });
                return username;
            }
            return user;
        }));

        res.status(200).json({success : true, user : user.filter(Boolean)});
        
    } catch (error : any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export const follow = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const { id : userId } = req.params as {id : string};
        const currentUser = req.user?.id;
        let userToModify : TInferSelectUser | undefined;

        const data = await redis.get(`user:${userId}`);
        userToModify = userToModify = JSON.parse(data!);

        if(userToModify === null) {
            userToModify = await db.query.UserTable.findFirst({where : (table, funcs) => funcs.eq(table.id, userId)});
        }

        if(userToModify?.id === currentUser) return next(new ErrorHandler('Cannot follow/unFollow yourself', 400));

        const isUserFollowed = await db.query.FollowersTable.findFirst({
            where : (table, funcs) => funcs.and(funcs.eq(table.followerId, currentUser!), funcs.eq(table.followedId, userToModify!.id))
        });

        if(!isUserFollowed) {
            await db.insert(FollowersTable).values({followerId : currentUser, followedId : userToModify?.id});
            return res.status(200).json({success : true, message : 'User followed successfully'});
        }

        await db.delete(FollowersTable).where(and(eq(FollowersTable.followerId, currentUser!), 
            eq(FollowersTable.followedId, userToModify!.id)));

        res.status(200).json({success : true, message : 'User unFollowed successfully'});
        
    } catch (error : any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export const updateProfileInfo = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const {error, value} = validateProfileInfo(req.body);
        if(error) return next(new ErrorHandler(error.message, 400));
        const { profilePic, bio, gender } = value as TInferInsertProfileInfo;

        const user = await db.query.UserTable.findFirst({where : (table, funcs) => funcs.eq(table.id, req.user?.id!)}) as TInferSelectUser;

        const profile = await db.query.ProfileInfoTable.findFirst({
            where : (table, funcs) => funcs.eq(table.userId, user.id)
        });

        if(!profile) {
            const profile = await db.insert(ProfileInfoTable).values({profilePic, bio, gender, userId : user.id}).returning();
            const profileResult = profile[0] as TInferInsertProfileInfo;

            res.status(200).json({success : true, profileResult});
        }

        const updatedProfile = await db.update(ProfileInfoTable).set({
            profilePic : profilePic || profile?.profilePic, bio : bio || profile?.bio, gender : gender || profile?.gender
        }).where(eq(ProfileInfoTable.userId, user.id)).returning();
        const profileResult = updatedProfile[0] as TInferSelectProfileInfo;

        const combineResult = combineResults(user, profileResult);
        await redis.set(`user:${user.id}`, JSON.stringify(combineResult), 'EX', 604800);

        res.status(200).json({success : true, profile : combineResult});
        
    } catch (error : any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

const combineResults = (user : TInferSelectUser, profile : TInferSelectProfileInfo) => {
    return {
        id: user.id, fullName: user.fullName, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt,
        updatedAt: user.updatedAt, profilePic: profile.profilePic, bio: profile.bio, gender: profile.gender
    };
}

export const updateAccountPassword = CatchAsyncError(async (req : Request, res : Response, next : NextFunction) => {

    try {
        const {error, value} = validatePassword(req.body);
        if(error) return next(new ErrorHandler(error.message, 400));
        const { oldPassword, newPassword } = value as TUpdatePassword;

        const user = await db.query.UserTable.findFirst({where : (table, funcs) => funcs.eq(table.id, req.user!.id)}) as TInferSelectUser;
        const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);

        if(!isPasswordMatch) return next(new ErrorHandler('The old password is incorrect. Please try again.', 400));

        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash(newPassword, salt);

        await db.update(UserTable).set({password}).where(eq(UserTable.id, user.id));
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
        return next(new ErrorHandler(error.message, 400));
    }
});