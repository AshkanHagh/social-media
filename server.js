import express from 'express';
import dotenv from 'dotenv';
import connectDB from './db/connectDB.js';
import cookieParser from 'cookie-parser';

import userRouter from './routes/userRoute.js';

dotenv.config();

connectDB();
const app = express();

const PORT = process.env.PORT || 5500;

app.use(express.json());
app.use(express.urlencoded({ extended : true }));
app.use(cookieParser());

// Routes
app.use('/api/users', userRouter);

app.listen(PORT, () => console.log(`server is running on Port ${PORT}`));