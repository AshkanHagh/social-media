import jwt, { type Secret } from 'jsonwebtoken';
import type { TCookieOption, TInferSelectUser } from '../@types';
import type { Response } from 'express';
import redis from '../db/redis';
import { BadRequestError } from './customErrors';
import { cookie } from './cookie';

const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || '300', 10);
const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || '1200', 10);

export const accessTokenOption : TCookieOption = {
    expires : new Date(Date.now() + accessTokenExpire * 24 * 60 * 60 * 1000),
    maxAge : accessTokenExpire * 24 * 60 * 60 * 1000,
    httpOnly : true,
    sameSite : 'lax'
}

export const refreshTokenOption : TCookieOption = {
    expires : new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
    maxAge : refreshTokenExpire * 24 * 60 * 60 * 1000,
    httpOnly : true,
    sameSite : 'lax'
}

export const sendToken = (user : TInferSelectUser, res : Response, tokeFor : 'login' | 'refresh') => {
    const accessToken = jwt.sign({id : user.id}, process.env.ACCESS_TOKEN as Secret, {expiresIn : '1h'});
    const refreshToken = jwt.sign({id : user.id}, process.env.REFRESH_TOKEN as Secret, {expiresIn : '7d'});

    const {password, ...others} = user;

    redis.hset(`user:${user.id}`, others).catch(error => {return new BadRequestError()});
    redis.expire(`user:${user.id}`, 604800);

    if(process.env.NODE_ENV) {
        accessTokenOption.secure = true
    }
    cookie({accessToken, refreshToken}, {accessTokenOption, refreshTokenOption}, res);
    if(tokeFor == 'refresh') return {accessToken}
    return {others, accessToken}
}