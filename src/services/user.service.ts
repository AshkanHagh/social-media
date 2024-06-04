import { and, eq } from 'drizzle-orm';
import type { TFindFirstOptions, TFindUserWithProfileInfo, TFollowerProfileInfo, TInferSelectFollowers, TInferSelectProfileInfo, TInferSelectUser, TInferSelectUserWithoutPassword, TProfileUpdateInfo,  TUpdateAccountOptions} from '../@types';
import { db } from '../db/db';
import { FollowersTable, ProfileInfoTable, UserTable } from '../db/schema';
import type { Response } from 'express';
import redis from '../db/redis';
import sendEmail from '../utils/sendMail';

export const regexQuery = (query : string) : string => {
    const escapedQuery = query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regexQuery = `%${escapedQuery}%`;
    return regexQuery;
}

export const combineResultsUserInfoAndProfile = (user : TInferSelectUser, profile : TInferSelectProfileInfo) => {
    return {
        id: user.id, fullName: user.fullName, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt,
        updatedAt: user.updatedAt, profilePic: profile.profilePic, bio: profile.bio, gender: profile.gender, account_status : profile.account_status
    };
}

export const searchUserWithUsername = async (query : string) : Promise<TInferSelectUserWithoutPassword[]> => {
    const dbRegexp : string = regexQuery(query);

    const user = await db.query.UserTable.findMany({
        where : (table, funcs) => funcs.ilike(table.username, dbRegexp),
        columns : {password : false}
    });
    return user as TInferSelectUserWithoutPassword[];
}

export const findFirstUserWithEmailOrId = async (options : TFindFirstOptions) : Promise<TInferSelectUserWithoutPassword> => {
    const { id, email, username } = options;
    let user;
    
    if(id && !email && !username) {
        user = await db.query.UserTable.findFirst({where : (table, funcs) => funcs.eq(table.id, id)});
    }else {
        user = await db.query.UserTable.findFirst({
            where : (table, funcs) => funcs.or(funcs.eq(table.email, email || ''), funcs.eq(table.username, username || ''))
        });
    }
    return user as TInferSelectUserWithoutPassword;
}

export const findFirstFollower = async (followerId : string, followedId : string) : Promise<TInferSelectFollowers | null> => {
    const follower = await db.query.FollowersTable.findFirst({
        where : (table, funcs) => funcs.and(funcs.eq(table.followerId, followerId), funcs.eq(table.followedId, followedId))
    });
    return follower as TInferSelectFollowers;
}

export const findFirstProfileInfo = async (id : string) : Promise<TInferSelectProfileInfo> => {
    const profile = await db.query.ProfileInfoTable.findFirst({
        where : (table, funcs) => funcs.eq(table.userId, id)
    });
    return profile as TInferSelectProfileInfo;
}

export const insertProfileInfo = async (bio : string, profilePic : string, gender : TInferSelectProfileInfo['gender'], id : string) : Promise<TInferSelectProfileInfo | null> => {
    const profileInfo = await db.insert(ProfileInfoTable).values({profilePic, bio, gender, userId : id}).returning();
    const profileResult = profileInfo[0] as TInferSelectProfileInfo;
    return profileResult as TInferSelectProfileInfo;
}

export const updateUserRedisProfile = async (user : TInferSelectUser, profilePic : TInferSelectProfileInfo) : Promise<void> => {
    const combineResult = combineResultsUserInfoAndProfile(user, profilePic);
    await redis.hset(`user:${user.id}`, combineResult);
    await redis.expire(`user:${user.id}`, 604800);
}

export const updateProfileInformation = async (profileUpdateInfo : TProfileUpdateInfo) : Promise<TInferSelectProfileInfo | null> => {
    const { bio, profilePic, gender, id } = profileUpdateInfo;

    const updatedProfile = await db.update(ProfileInfoTable).set({
        bio, profilePic, gender
    }).where(eq(ProfileInfoTable.userId, id)).returning();

    const profileResult = updatedProfile[0] as TInferSelectProfileInfo;
    return profileResult;
}

export const findFollowerInfo = async (followerId : string, followedId : string) : Promise<TFollowerProfileInfo | null> => {

    const follows = await db.query.FollowersTable.findFirst({
        where : (table, funcs) => funcs.and(funcs.eq(table.followerId, followerId), funcs.eq(table.followedId, followedId)),
        with : {follower : {with : {profileInfo : true}}},
        columns : {followedId : false, followerId : false}
    });

    if (!follows || !follows.follower) return null;

    const follower = follows!.follower;
    const followedResult = <TFollowerProfileInfo>{
        id : follower.id, username : follower.username, profilePic : follower.profileInfo?.profilePic
    }
    return followedResult;
}

export const newFollow = async (followerId : string, followedId : string, res : Response) => {

    const follower = await db.insert(FollowersTable).values({followerId : followerId, followedId : followedId});
    const follows : TFollowerProfileInfo | null = await findFollowerInfo(followerId as string, followedId as string);

    await redis.hset(`followers:${followedId}`, followerId, JSON.stringify(follows));
    return res.status(200).json({success : true, message : 'User followed successfully'});
}

export const unFollow = async (followerId : string, followedId : string, res : Response) => {

    await db.delete(FollowersTable).where(and(eq(FollowersTable.followerId, followerId), eq(FollowersTable.followedId, followedId)));
    await redis.hdel(`followers:${followedId}`, followerId);

    res.status(200).json({success : true, message : 'User unFollowed successfully'});
}

export const updateFollowerInfo = async (user: TInferSelectUserWithoutPassword) => {
    let cursor = '0';
    do {
        const [newCursor, keys] = await redis.scan(cursor, 'MATCH', `followers:*`, 'COUNT', 100);
        
        for(const key of keys) {
            const followers = await redis.hgetall(key);
            const pipeline = redis.pipeline();
            
            for (const followerId in followers) {
                const follower = JSON.parse(followers[followerId]);
                if (follower.id === user.id) {
                    follower.username = user.username;
                    pipeline.hset(key, followerId, JSON.stringify(follower));
                }
            }
            await pipeline.exec();
        }
        cursor = newCursor;
    } while (cursor !== '0');
}

export const updateAccount = async (options : TUpdateAccountOptions) => {
    const { id, fullName, email, username, password } = options;

    if(password) {
        await db.update(UserTable).set({password}).where(eq(UserTable.id, id!));
    }else {
        const updateInfo = await db.update(UserTable).set({fullName, email, username}).where(eq(UserTable.id, id)).returning();
        const updateInfoResult = updateInfo[0];
        return updateInfoResult;
    }
}

export const sendMailForPasswordChanged = async (email : string) => {
    await sendEmail({
        email: email,
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
} 

export const findFirstUserWithRelations = async (id : string) : Promise<TFindUserWithProfileInfo> => {
    const user = await db.query.UserTable.findFirst({where : (table, funcs) => funcs.eq(table.id, id), with : {profileInfo : true}});
    return user as TFindUserWithProfileInfo;
}

export const findManyFollowersWithRelations = async (id : string) => {
    const user = await db.query.FollowersTable.findMany({
        where : (table, funcs) => funcs.eq(table.followedId, id),
        with : {follower : {with : {profileInfo : true}}},
        columns : {followedId : false, followerId : false}
    });
    return user;
}

export const findManyUserFollowers = async (userId : string) => {
    const follow = await db.query.FollowersTable.findMany({
        where : (table, funcs) => funcs.or(funcs.eq(table.followedId, userId), funcs.eq(table.followerId, userId))
    });
    return follow;
}