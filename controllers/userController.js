import bcrypt from 'bcryptjs';
import User from '../models/userModel.js';
import generateTokenAndSetCookie from '../utils/generateToken.js';

const getUserProfile = async (req, res) => {

    const { username } = req.params;

    try {
        const user = await User.findOne({username}).select('-password').select('-updatedAt');
        if(!user) return res.status(400).json({message : 'User not found'});

        res.status(200).json({user});
        
    } catch (error) {
        
        res.status(500).json({message: error.message});

        console.log('Error in getUserProfile Controller: ', error.message);
    }

}

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

        if(id === req.user._id.toString()) return res.status(400).json({message : 'You cannot follow/unFollow yourself'});

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

const updateUser = async (req, res) => {

    const { name, email, username, password, profilePic, bio } = req.body;
    const userId = req.user._id;

    try {
        let user = await User.findById(userId);
        if(!user) return res.status(400).json({message : 'User not found'});

        if(req.params.id !== userId.toString()) return res.status(400).json({message : 'You cannot change other users profile'});

        if(password) {

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            user.password = hashedPassword;
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.username = username || user.username;
        user.profilePic = profilePic || user.profilePic;
        user.bio = bio || user.bio;

        user = await user.save();

        res.status(200).json({message : 'Profile updated successfully', user});

    } catch (error) {
        
        res.status(500).json({message: error.message});

        console.log('Error in updateUser Controller: ', error.message);
    }

}


export { signup, login, logout, followUnFollowUser, updateUser, getUserProfile };