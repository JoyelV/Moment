const User = require("../models/userModel");

const isLogin = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            
            const userId = req.session.user_id;
            const user = await User.findById(userId);

            if (user && user.block === '1') {
                req.session.destroy(() => {
                    res.redirect('/login'); 
                });
            } else {
                next();
                
            }
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        console.error("Error in isLogin middleware:", error);

        res.status(500).send('Internal Server Error');
    }
};

const isLogout = async(req,res,next)=>{
    try{
        if(req.session.user_id){
            const userId = req.session.user_id;
            const user = await User.findById(userId);
            if (user.is_admin === 0) {
            res.redirect('/home')
            }
        }else{
            next();
        }
    }
    catch(error){
        console.log(error.message);
    }
}

module.exports = {
    isLogin,
    isLogout
}