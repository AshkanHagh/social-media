import bcrypt from 'bcryptjs';
import User from '../models/userModel.js';
import generateTokenAndSetCookie from '../utils/generateToken.js';

const signup = async (req, res) => {
    
    try {
        const { name, email, username, password } = req.body;

        const user = await User.findOne({$or: [{email}, {username}]});

        if(user) {
            return res.status(400).json({message : 'User already exists'});
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({

            name,
            email,
            username,
            password: hashedPassword
        });

        await newUser.save();

        if(newUser) {
            generateTokenAndSetCookie(newUser._id, res);

            res.status(201).json({_id: newUser._id, name: newUser.name, email: newUser.email, username: newUser.username});

        }else {
            res.status(400).json({message : 'invalid user data'});
        }

    } catch (error) {

        res.status(500).json({message: error.message});

        console.log('Error in signup Controller: ', error.message);
    }

}

const login = async (req, res) => {

    try {
        const { username, password } = req.body;

        const user = await User.findOne({username});

        const isPassword = await bcrypt.compare(password, user?.password || '');

        if(!user || !isPassword) return res.status(400).json({message: 'invalid username or password'});

        generateTokenAndSetCookie(user._id, res);

        res.status(200).json({_id: user._id, name: user.name, email: user.email, username: user.username});

    } catch (error) {

        res.status(500).json({message: error.message});

        console.log('Error in login Controller: ', error.message);
    }

}

const logout = async (req, res) => {

    try {
        res.cookie('jwt', '', {maxAge : 1});

        res.status(200).json({message : 'User logged out successfully'});

    } catch (error) {
        
        res.status(500).json({message: error.message});

        console.log('Error in logout Controller: ', error.message);
    }

}

const followUnFollowUser = async (req, res) => {

    try {
        const { id } = req.params;

        const userToModify = await User.findById(id);

        const currentUser = await User.findById(req.user._id);

        if(id === req.user._id) return res.status(400).json({message : 'You cannot follow/unFollow yourself'});

        if(!currentUser || !userToModify) return res.status(400).json({message : 'User not found'});

        const isFollowing = currentUser.following.includes(id);

        if(isFollowing) {
            // unFollow
            await User.findByIdAndUpdate(req.user._id, {$pull : {following : id}});
            await User.findByIdAndUpdate(id, {$pull : {followers : req.user._id}});

            res.status(200).json({message : 'User unFollowed successfully'});

        }else {
            // follow
            await User.findByIdAndUpdate(req.user._id, {$push : {following : id}});
            await User.findByIdAndUpdate(id, {$push : {followers : req.user._id}});

            res.status(200).json({message : 'User followed successfully'});
        }
        
    } catch (error) {

        res.status(500).json({message: error.message});

        console.log('Error in follow Controller: ', error.message);
    }

}


export { signup, login, logout, followUnFollowUser };