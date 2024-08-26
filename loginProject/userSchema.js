const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    username:{
        type:String,
        unique:true
    },
    password:{
        type:String,
        unique:true
    },
    email:{
        type:String,
        unique:true
    },
    age:Number,

    address:String,

    mobileNo:{
        type:Number,
        unique:true
    },
    profile:{
        url : String
    }
})

module.exports = mongoose.model('users',userSchema)