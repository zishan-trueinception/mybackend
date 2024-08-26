const express = require('express');
require('./config');
const Product = require('./product');
const app = express();

app.use(express.json());
app.post('/create',async (req,res)=>{
    let data = await new Product(req.body);
    const result = await data.save();
    res.send('Account Created Successfully');
});

app.get('/login',async (req,res)=>{
    let data =  await new Product(req.body);
    const result = await Product.find();
    res.send(result);
})

app.delete('/delete/:_id',async(req,res)=>{
    let data = await Product.deleteOne(req.params);
    res.send('Account Deleted Successfully');
})

app.put('/update/:_id',async(req,res)=>{
    let data = await Product.updateOne(
        req.params,
        {
            $set:req.body
        }
    )
    res.send('Account Updated Successfully');
})



app.listen(4000)

// for multiple search use $or
/*
app.get('/search/:key',async(req,res)=>{
    let data = await Product.find(
    {
        "$or":[
            {"name":{$regex:req.query.key}},
            {"brand":{$regex:req.query.key}},
            {"price":{$regex:req.query.key}},
            {"category":{$regex:req.query.key}}
        ]    
    }
    )
    })
*/