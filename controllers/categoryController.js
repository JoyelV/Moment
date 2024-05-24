const Category = require("../models/categoryModel");

const createCategory = async (req, res) => {
    try {
        const name = req.body.name;
        const dis = req.body.description;
        const existingcate = await Category.findOne({
            name: name.toLowerCase(),
        });

        if (existingcate) {
            const categorydetails = await Category.find();
            res.render('category', { category: categorydetails, message: 'category name already exists' });
        } else {
            const cat = new Category({
                name: name.toLowerCase(),
                description: dis,
            });
            await cat.save();
            const categorydetails = await Category.find();
            res.render('category', { category: categorydetails, message: 'Category added successfully!' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ status: false, error: "Internal Server Error" });
    }
};

const editCategoryLoad = async (req, res) => {
    try {
        const id = req.query.id;
        const categoryData = await Category.findById({_id:id});
       
        if (categoryData) {
            res.render('edit-cate', { category: categoryData });
        } else {
            res.redirect('/admin/category');
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const updateCate = async(req,res)=>{
    try{
        let name = req.body.name;
        const dis = req.body.description;
        let existingcate = await Category.findById({_id:req.query.id});
        if(existingcate){
            let existingcat = await Category.findOne({name:name.toLowerCase()});
            if(existingcat){
                await Category.findByIdAndUpdate({_id:req.query.id},{$set:{ description:req.body.description}});
                res.redirect('/admin/category');
            }else{
                await Category.findByIdAndUpdate({_id:req.query.id},{$set:{ name: name.toLowerCase(),description:req.body.description}});
                res.redirect('/admin/category');
            }
        }
    }
    catch(error){
      console.log(error.message);
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.query;
        await Category.findByIdAndUpdate(id, { is_active: false });
        res.redirect('/admin/category');
    } catch (error) {
        console.log(error.message);
    }
};

const restoreCategory = async (req, res) => {
    try {
        const { id } = req.query;
        await Category.findByIdAndUpdate(id, { is_active: true });
        res.redirect('/admin/category');
    } catch (error) {
        console.log(error.message);
    }
};

module.exports = {
    createCategory,
    editCategoryLoad,
    updateCate,
    deleteCategory,
    restoreCategory
};
