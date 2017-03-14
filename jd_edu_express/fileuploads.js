/**
 * Created by gogir on 2017/2/27.
 */
var multer = require('multer');
var md5 = require('md5');
var fs = require('fs');

var storage = multer.diskStorage({
    //设置上传文件路径,以后可以扩展成上传至七牛,文件服务器等等
    //Note:如果你传递的是一个函数，你负责创建文件夹，如果你传递的是一个字符串，multer会自动创建
    destination: function (req, file, cb) {
        var this_cb = cb;
        var pathupload = process.cwd() + '/public/uploads';
        var pathname = pathupload + '/' + req.headers.referer.split('=')[1];
        // var pathname = process.cwd() + '/public/uploads';
        fs.exists(pathupload, function (exists) {
            if (exists) {
                fs.exists(pathname, function (exists) {
                    if (exists) {
                        this_cb(null, pathname);
                    } else {
                        fs.mkdir(pathname, function (err) {
                            if (err)
                                console(err);
                            this_cb(null, pathname);
                        });
                    }
                });
            } else {
                fs.mkdir(pathupload, function (err) {
                    if (err)
                        console(err);
                    fs.exists(pathname, function (exists) {
                        if (exists) {
                            this_cb(null, pathname);
                        } else {
                            fs.mkdir(pathname, function (err) {
                                if (err)
                                    console(err);
                                this_cb(null, pathname);
                            });
                        }
                    });
                });
            }
        });
    },
    //获取文件MD5，重命名，添加后缀,文件重复会直接覆盖
    filename: function (req, file, cb) {
        //var fileFormat = (file.originalname).split(".");
        //cb(null, file.fieldname + '-' + md5(file.originalname) + "." + fileFormat[fileFormat.length - 1]);
        cb(null, file.originalname);
    }
});

//添加配置文件到muler对象。
var upload = multer({
    storage: storage
    //其他设置请参考multer的limits
    //limits:{}
});
//导出对象
module.exports = upload;