const User = require("../models/userModel");

const isLogin = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            const userId = req.session.user_id;
            const user = await User.findById(userId);

            if (user && user.is_admin === 1) {
                next();
            } 
        } else {
            res.redirect('/admin');
        }
    } catch (error) {
        console.error("Error in isLogin middleware:", error);
        res.status(500).send('Internal Server Error');
    }
};

const isLogout = async(req,res,next)=>{
    try{
        if(req.session.user_id){
         res.redirect("/admin/home");
        }
        next();

    } catch (error){
        console.log(error.message);
    }
}

module.exports = {
    isLogin,
    isLogout
}