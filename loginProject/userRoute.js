const mongoose = require('mongoose');
const express = require('express');
const multer = require('multer')
const userConfig = require('./userConfig');
const userSchema = require('./userSchema');
const jwt = require('jsonwebtoken');
const secretkey = 'secretkey';
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

// SignUp route without using bcrypt.
// app.post('/signup',async (req,res) => {
//     const data =  await new userSchema(req.body);
//     const result = await data.save();
//     console.log(result);`
//     res.send('Account Created Successfully');
// })

// SignUp route using bcrypt

app.post('/signup',async(req,res)=>{
    try{
        const salt = await bcrypt.genSalt(10); //The salt is used to make the password hashing process more secure.

        // bcrypt.hash() is used to hash the password.
        const hashedPassword = await bcrypt.hash(req.body.password,salt); 

        // Replace the plain text password with the hashed password
        const data = new userSchema({
            ...req.body,
            password:hashedPassword
        })
        //save the data to the database
        const result = await data.save();
        res.send('Account Created Successfully');
    }catch(error){
        console.error(error);
        res.status(500).send('Error creating account');
    }
})

// SignIn / login route without comparing hashed password
// app.post('/login',async(req,res)=>{
//     const data = await userSchema.findOne(req.body);
//     if(data){
//         if(req.body.password === data.password && req.body.username === data.username){
//             const { password, ...userWithoutPassword } = data.toObject();
//             jwt.sign({user:userWithoutPassword},secretkey,{expiresIn:'1h'},(err,token)=>{
//                 res.send({token})
//             })
//         }else{ 
//             res.send('Invalid Password')
//         }
//     }else{
//         res.send('Invalid User')
//     }
// })

//( we use bcrypt.compare to compare the plain text password with the hashed password)
// new signIn route
app.post('/login',async(req,res)=>{
    try{
        const data = await userSchema.findOne({username:req.body.username});
        if(!data){
            res.status(400).send('Invalid username or password');
        }

        // Compare the hashed password with the provided plain text password
        const validPassword = await bcrypt.compare(req.body.password,data.password);
        if(!validPassword){
            res.status(400).send('Invalid username or password');
        }

        // If the password is valid, generate a JWT token
        const {password, ...userWithoutPassword} = data.toObject();
        jwt.sign({user:userWithoutPassword},secretkey,{expiresIn:'2h'},(err,token)=>{
            if(err){
                console.log(err);
                res.status(500).send('token generation failed');
            }
            res.json({token});
        })
    }catch(error){
        console.error(error);
        res.status(500).send('login Error');
    }
})

// profile route
app.get('/profile',verifyToken,(req,res)=>{
    jwt.verify(req.token,secretkey,(err,authData)=>{
        if(err){
            res.send({result:'Invalid Token'})
        }else{
            res.json({
                message:'profile accessed',
                authData
            })
            console.log(authData);
        }
    })
 })

  // middleware for authenticate requests based on a JWT passed in the Authorization header.
function verifyToken(req,res,next){
    const bearerHeader = req.headers['authorization'];
    if(typeof bearerHeader !== 'undefined'){
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        req.token = bearerToken;
        next();
    }else{
        res.send({
            result:'Invalid Token'
        })
    }
 }

 // profile upload route
const upload = multer({
    storage:multer.diskStorage({
        destination:function(req,file,cb){                       
            cb(null,'loginProject/uploads') 
        },
        filename:function(req,file,cb){
             cb(null,file.fieldname + "-" + Date.now() + ".jpg");
        }
    })
}).single("profile_picture");

// upload route for without verifying token
// app.post('/upload',upload,async (req,res)=>{
//     const data =  await new userSchema(req.body);
//     const result = await data.save();
//     console.log(result);
//     res.send('file uploaded successfully'); 
// });

// upload route for verifying token
// app.post('/upload',verifyToken,upload,async (req,res)=>{
//     const data = await new userSchema(req.body);
//     jwt.verify(req.token,secretkey,async (err,authData)=>{
//         if(err){
//             res.status(401).send({result:'Invalid Token'})
//         }else{
//             const result = await authData.save();
//             console.log(result);
//             res.status(200).send('file uploaded successfully');
//         }
//     })
// })

// upload image route with verify token
app.post('/upload', verifyToken, upload, async (req, res) => {
    jwt.verify(req.token, secretkey, async (err, authData) => {
        if (err) {
            res.status(401).send({ result: 'Invalid Token' });
        }
        
        try {
            // Get the file path
            const fieldname = req.file.fieldname;
            const filePath = req.file.path;

            // Update the user's profile with the file path
            const updatedUser = await userSchema.findOneAndUpdate(
                { _id: authData.user._id },
                { 'profile.path': filePath, 'profile.fieldname': fieldname },
                { new: true }
            );

            if (!updatedUser) {
                return res.status(404).send('User not found');
            }

            // Access the username from the updatedUser object
            const username = updatedUser.username;

            res.status(200).send({ 
                message: 'File uploaded successfully', 
                user: updatedUser, 
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Server error');
        }
    });
});

// Download endpoint
app.get('/download/:filedname', (req, res) => {
    const filename = req.params.filedname;
    const filePath = path.join(__dirname, '/uploads', filename);
  
    res.download(filePath, (err) => {
      if (err) {
        console.error(err);
        res.status(404).send('File not found.');
      }
    });
  });


 // Search route
app.get('/search/:key', async (req, res) => {
    const data = await userSchema.findOne({
        "username": { $regex: req.params.key, /*$options: 'i'*/ } // Case-insensitive search
    });
    if (data) {
        // Exclude the password field from the response
        const { password, ...userWithoutPassword } = data.toObject();
        res.send(userWithoutPassword);
    } else {
        res.status(404).send({ message: 'User not found' });
    }
});

app.put('/update', verifyToken, async (req, res) => {
    // Verify the JWT token
    jwt.verify(req.token, secretkey, async (err, authData) => {
        if (err) {
            return res.status(401).send({ result: 'Invalid Token' });
        }
        try {
            // Update the user's profile with the data from req.body
            const updatedUser = await userSchema.findOneAndUpdate(    
                { _id:authData.user._id}, 
                req.body,   
                { new: true}       
            );
            if (!updatedUser) {
                return res.status(404).send('User not found');
            }
            res.send({ message: 'Profile Updated Successfully', user: updatedUser });
        } catch (error) {
            console.error(error);
            res.status(500).send('Server error');
        }
    });
});





// listening port for server
 app.listen(4000,()=>{
    console.log('server listening on port 4000');
    
 })


 // test api
// app.post('/test',async (req,res)=>{
//     const data = await new userSchema(req.body);
//     const result = await data.save();
//     res.send(result);
//     console.log(result);
// })