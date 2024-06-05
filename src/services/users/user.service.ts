import type { TInferSelectProfileInfo, TInferSelectUser, TInferSelectUserWithoutPassword } from '../../@types';
import { findFirstFollower, findFirstProfileInfo, findFirstUserWithEmailOrId, findFirstUserWithRelations, findManyFollowersWithRelations, findManyUserFollowers, insertProfileInfo, newFollow, searchUserWithUsername, unFollow, updateAccount, updateProfileInformation, updateUserRedisProfile }
from '../../db/primary-database-queries/users/user.query';
import { BadRequestError, EmailOrUsernameExistsError, ResourceNotFoundError, UpdateFollowerInfoError, UserNotFoundError } from '../../utils/customErrors';
import bcrypt from 'bcrypt';
import ErrorHandler from '../../utils/errorHandler';
import { hashPassword } from '../../utils/hashPassword';
import { eventEmitter } from '../../events/user.subscriptions';
import { addNewFollowersInCache, findInCache, searchUserFromCache, updateFollowerInfoCache, updatedUserProfileCache } 
from '../../db/secondary-database-queries/users/users.cache';

export const searchUsers = async (query : string, active : string, userId : string) => {
    
    try {
        if(active == 'OK') {
            const matchedUsers = await searchUserFromCache(query);
            if(matchedUsers.length <= 0) throw new UserNotFoundError();

            const filteredUsers = matchedUsers.filter(user => user.id !== userId);
            return filteredUsers;
        }

        const searchedUser = await searchUserWithUsername(query);
        if(searchedUser.length <= 0 ) throw new UserNotFoundError();

        const filteredUsers = searchedUser.filter(user => user.id !== userId);
        return filteredUsers;
        
    } catch (error) {
        throw error;
    }
}

export const followUser = async (currentUser : string, userId : string) => {

    try {
        let userToModify : TInferSelectUserWithoutPassword | null;

        const userRaw = await findInCache('user', userId);
        userToModify = userRaw as unknown as TInferSelectUser;

        if(Object.keys(userRaw).length <= 0) userToModify = await findFirstUserWithEmailOrId({id : userId});
        if(userToModify?.id === currentUser) throw new BadRequestError();

        const isUserFollowed = await findFirstFollower(currentUser as string, userId);
        if(!isUserFollowed) {
            await newFollow(currentUser as string, userId);
            return 'User followed successfully';
        }

        await unFollow(currentUser as string, userId);
        return 'User unFollowed successfully';

    } catch (error) {
        throw error;
    }
}

export const updateProfile = async (profilePic : string, bio : string, gender : TInferSelectProfileInfo['gender'], user : TInferSelectUser) => {
    
    try {
        const profile = await findFirstProfileInfo(user.id);
        if(!profile) {
            const profile = await insertProfileInfo(bio, profilePic, gender, user.id);
            return profile;
        }
        const updateValue = {bio : bio || profile.bio, profilePic : profilePic || profile.profilePic, gender : gender || profile.gender, id : user.id}
        const updatedProfile = await updateProfileInformation(updateValue);

        updateUserRedisProfile(user, updatedProfile!);
        return updatedProfile;

    } catch (error) {
        throw error;
    }
}

export const updatePassword = async (oldPassword : string, newPassword : string, userId : string) => {
    
    try {
        const user = await findFirstUserWithEmailOrId({id : userId}) as TInferSelectUser;
        const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
        if(!isPasswordMatch) return new ErrorHandler('The old password is incorrect. Please try again.', 400);
    
        const password = await hashPassword(newPassword);
        await updateAccount({password, id : user.id});
        eventEmitter.emit('changedPassword', user.email);

    } catch (error) {
        throw error;
    }
}

export const updateInfo = async (fullName : string, email : string, username : string, userToModify : TInferSelectUser) => {
    try {
        const isUserExists = await findFirstUserWithEmailOrId({email, username});
        if(isUserExists) throw new EmailOrUsernameExistsError();

        const updateValue = {id : userToModify.id, fullName : fullName || userToModify.fullName, email : email || userToModify.email,
            username : username || userToModify.username
        };
        const updateInfo = await updateAccount(updateValue);
        const {password, ...others} = updateInfo as TInferSelectUser

        updateFollowerInfo(others).catch(error => {throw new UpdateFollowerInfoError(error.message)});
        await updatedUserProfileCache(userToModify.id, others);
        return others;

    } catch (error) {
        throw error;
    }
}

export const usersProfile = async (userId : string) => {
    try {
        const user = await findFirstUserWithRelations(userId!);
        const follow = await findManyUserFollowers(userId!);

        const following = follow.filter(follow => follow.followerId?.includes(userId!));
        const followers = follow.filter(follow => follow.followedId?.includes(userId!));
        const profileInfo = user?.profileInfo as TInferSelectProfileInfo;

        const profile = combineResultsUserInfoAndProfile(user as TInferSelectUser, profileInfo);
        return {profile, following, followers}

    } catch (error) {
        throw error;
    }
}

export const combineResultsUserInfoAndProfile = (user : TInferSelectUser, profile : TInferSelectProfileInfo) => {
    return {
        id: user.id, fullName: user.fullName, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt,
        updatedAt: user.updatedAt, profilePic: profile.profilePic, bio: profile.bio, gender: profile.gender, account_status : profile.account_status
    };
}

export const updateFollowerInfo = async (user: TInferSelectUserWithoutPassword) => {
    updateFollowerInfoCache(user);
}

export const followersInfo = async (redisKey : string, userId : string) => {
    
    try {
        const cachedFollowers = await findInCache('followers', userId);
        const cachedFollowersArray = Object.values(cachedFollowers);

        if(cachedFollowersArray.length > 0) {
            const followersList = cachedFollowersArray.map(follow => JSON.parse(follow));
            return followersList;
        }

        const followers = await findManyFollowersWithRelations(userId!);
        if(followers.length <= 0) throw new ResourceNotFoundError();

        const mappedFollowers = followers.map(followers => {
            const follower = followers.follower;
            return {id : follower?.id, username : follower?.username, profilePic : follower?.profileInfo?.profilePic}
        });
        
        const followerEntries = mappedFollowers.filter(follow => follow.id !== undefined).flatMap(follow => [follow.id as string, 
        JSON.stringify(follow)]);

        addNewFollowersInCache(redisKey, ...followerEntries)
        return mappedFollowers;

    } catch (error) {
        throw error;
    }
}