import type { Response } from 'express';
import type { TTokenOptions, TTokenPair } from '../@types';

export const cookie = (tokens : TTokenPair,  options: TTokenOptions, res : Response) => {
    res.cookie('access_token', tokens.accessToken, options.accessTokenOption);
    res.cookie('refresh_token', tokens.refreshToken, options.refreshTokenOption);
}