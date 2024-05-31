import Joi from 'joi';

const validator = (schema : Joi.Schema) => (payload : object) => schema.validate(payload, {abortEarly : false});

const register = Joi.object({
    fullName : Joi.string().required().trim().max(255),
    email : Joi.string().email().required().trim().max(255),
    username : Joi.string().required().trim().max(255),
    password : Joi.string().min(6).required().trim()
});

export const validateRegister = validator(register);

const verifyAccount = Joi.object({
    activationCode : Joi.string().required().trim(),
    activationToken : Joi.string().required().trim()
});

export const validateVerifyAccount = validator(verifyAccount);

const login = Joi.object({
    email : Joi.string().email().required().trim().max(255),
    password : Joi.string().min(6).required().trim(),
});

export const validateLogin = validator(login);

const updateProfileInfo = Joi.object({
    profilePic : Joi.string().trim(),
    bio : Joi.string().max(500).trim(),
    gender : Joi.string().trim()
});

export const validateProfileInfo = validator(updateProfileInfo);

const updatePassword = Joi.object({
    oldPassword : Joi.string().required().trim(),
    newPassword : Joi.string().required().trim()
});

export const validatePassword = validator(updatePassword);