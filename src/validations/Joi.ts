import Joi, { type ObjectSchema } from 'joi';
import { ValidationError } from '../utils/customErrors';

// const validator = (schema : ObjectSchema) => (payload : ObjectSchema) => schema.validate(payload, {abortEarly : false});

export const validate = <T>(schema: ObjectSchema, data: T) => {
    const { error, value } = schema.validate(data, { stripUnknown: true });
    if (error) {
        throw new ValidationError(error.message);
    }
    return value;
};

export const registerSchema : ObjectSchema = Joi.object({
    fullName : Joi.string().required().trim().max(255),
    email : Joi.string().email().required().trim().max(255),
    username : Joi.string().required().trim().max(255),
    password : Joi.string().min(6).required().trim()
});

// export const validateRegister = validator(register);

export const verifyAccountSchema : ObjectSchema = Joi.object({
    activationCode : Joi.string().required().trim(),
    activationToken : Joi.string().required().trim()
});

export const loginSchema : ObjectSchema = Joi.object({
    email : Joi.string().email().required().trim().max(255),
    password : Joi.string().min(6).required().trim(),
});

export const updateProfileInfoSchema : ObjectSchema = Joi.object({
    profilePic : Joi.string().trim(),
    bio : Joi.string().max(500).trim(),
    gender : Joi.string().trim()
});

export const updatePasswordSchema : ObjectSchema = Joi.object({
    oldPassword : Joi.string().required().trim(),
    newPassword : Joi.string().required().trim()
});

export const updateInfoSchema : ObjectSchema = Joi.object({
    fullName : Joi.string().trim().max(255),
    username : Joi.string().trim().max(255),
    email : Joi.string().email().trim().max(255)
});

export const newPostSchema : ObjectSchema = Joi.object({
    text : Joi.string().required().trim().max(500),
    image : Joi.string().trim()
});

export const newCommentSchema : ObjectSchema = Joi.object({
    text : Joi.string().required().trim().max(500),
});

export const updatedCommentText : ObjectSchema = Joi.object({
    text : Joi.string().required().trim().max(500)
});

export const replaySchema : ObjectSchema = Joi.object({
    text : Joi.string().required().trim().max(500)
});