import { and, eq } from 'drizzle-orm';
import type { TFindFirstOptions, TFindUserWithProfileInfo, TFollowerProfileInfo, TInferSelectFollowers, TInferSelectProfileInfo, TInferSelectUser, TInferSelectUserWithoutPassword, TProfileUpdateInfo, TUpdateAccountOptions } from '../../../@types';
import { combineResultsUserInfoAndProfile } from '../../../services/users/user.service';
import { db } from '../../db';
import { FollowersTable, ProfileInfoTable, UserTable } from '../../schema';
import { regexQuery } from '../../../utils/regexQuery';
import { delFollowerCache, newFollowerCache, updatedUserProfileCache } from '../../secondary-database-queries/users/users.cache';


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
    await updatedUserProfileCache(user.id, combineResult as unknown as TInferSelectUser); // type error
}

export const updateProfileInformation = async (profileUpdateInfo : TProfileUpdateInfo) : Promise<TInferSelectProfileInfo | null> => {
    const { bio, profilePic, gender, id } = profileUpdateInfo;

    const updatedProfile = await db.update(ProfileInfoTable).set({
        bio, profilePic, gender
    }).where(eq(ProfileInfoTable.userId, id)).returning();

    const profileResult = updatedProfile[0] as TInferSelectProfileInfo;
    return profileResult;
}

export const findFirstFollowerWithRelations = async (followerId : string, followedId : string) => {
    const follows = await db.query.FollowersTable.findFirst({
        where : (table, funcs) => funcs.and(funcs.eq(table.followerId, followerId), funcs.eq(table.followedId, followedId)),
        with : {follower : {with : {profileInfo : true}}},
        columns : {followedId : false, followerId : false}
    });
    return follows;
}

export const findFollowerInfo = async (followerId : string, followedId : string) : Promise<TFollowerProfileInfo | null> => {
    const follows = await findFirstFollowerWithRelations(followerId, followedId);
    if (!follows || !follows.follower) return null;

    const follower = follows!.follower;
    const followedResult = <TFollowerProfileInfo>{
        id : follower.id, username : follower.username, profilePic : follower.profileInfo?.profilePic
    }
    return followedResult;
}

export const newFollow = async (followerId : string, followedId : string) => {

    const follower = await db.insert(FollowersTable).values({followerId : followerId, followedId : followedId});
    const follows : TFollowerProfileInfo | null = await findFollowerInfo(followerId as string, followedId as string);
    await newFollowerCache(followedId, followerId, follows!);
}

export const unFollow = async (followerId : string, followedId : string) => {

    await db.delete(FollowersTable).where(and(eq(FollowersTable.followerId, followerId), eq(FollowersTable.followedId, followedId)));
    await delFollowerCache(followedId, followerId);
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