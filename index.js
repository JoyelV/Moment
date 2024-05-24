const mongoose = require('mongoose');
const nocache = require('nocache');
const express = require('express');
const session = require('express-session');
var path = require('path');
require('dotenv').config();
const passport = require('passport') 
const {initializingPassport} = require("./config/passportConfig")
const adminRoute = require("./routes/adminRoute");
const userRoute = require("./routes/userRoute");
const config = require("./config/config")

initializingPassport(passport);

mongoose.connect("mongodb://localhost:27017/ums");
const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(express.static(path.join(__dirname,'views')));

app.use(express.static('public'));

app.use(nocache());

app.use(
  session({
    name: "session",
    secret: config.sessionSecret, 
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, 
  })
);

app.use(passport.initialize()); 
app.use(passport.session());

app.get('/auth/google',
  passport.authenticate('google', { scope: ['email','profile'] }));  

app.get('/auth/google/callback', 
  passport.authenticate('google',{ failureRedirect: '/login'}),
  function(req,res){
    res.redirect('/home');
  });

app.use("/", userRoute); 
app.use("/admin", adminRoute);

const PORT = 4002;
app.listen(PORT, function () {
  console.log(`Server is running on port ${PORT}`);
});
