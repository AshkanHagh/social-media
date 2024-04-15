import express from 'express';
import dotenv from 'dotenv';
import connectDB from './db/connectDB.js';
import cookieParser from 'cookie-parser';
import {v2 as cloudinary} from 'cloudinary';
import cors from 'cors';

import userRouter from './routes/userRoute.js';
import postRouter from './routes/postRoute.js';

dotenv.config();

connectDB();
const app = express();

const PORT = process.env.PORT || 5500;

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(cors({credentials : true}));
app.use(express.json({limit : '50mb'}));
app.use(express.urlencoded({ extended : true }));
app.use(cookieParser());

// Routes
app.use('/api/users', userRouter);
app.use('/api/posts', postRouter);

app.listen(PORT, () => console.log(`server is running on Port ${PORT}`));