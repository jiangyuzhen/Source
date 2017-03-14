/**
 * Created by gogir on 2017/2/27.
 */
var express = require('express');
var router = express.Router();
var upload = require('../fileuploads');
var fs = require('fs');

//文件上传服务
router.post('/upload', upload.single('avatar'), function (req, res, next) {
    var url = 'uploads/' + req.body.floderName + '/' + req.file.filename;
    res.render('./admin/uploadfile_end',{file_url:url});
});

router.post('/delteacherpic', function (req, res, next) {
    var filepath =  process.cwd() + '/public/'  + req.query.pic_url;
    console.log(filepath);
    fs.unlink(filepath,function () {
        res.send({errno:0,errmsg:''});
    });
});

router.post('/delteacherdocpath', function (req, res, next) {
    //删除所有的文件(将所有文件夹置空)
    var emptyDir = function(fileUrl){
        var files = fs.readdirSync(fileUrl);//读取该文件夹
        files.forEach(function(file){
            var stats = fs.statSync(fileUrl+'/'+file);
            if(stats.isDirectory()){
                emptyDir(fileUrl+'/'+file);
            }else{
                fs.unlinkSync(fileUrl+'/'+file);
                console.log("删除文件"+fileUrl+'/'+file+"成功");
            }
        });
    }
    //删除所有的空文件夹
    var rmEmptyDir = function(fileUrl){
        var files = fs.readdirSync(fileUrl);
        if(files.length>0){
            var tempFile = 0;
            files.forEach(function(fileName)
            {
                tempFile++;
                rmEmptyDir(fileUrl+'/'+fileName);
            });
            if(tempFile==files.length){//删除母文件夹下的所有字空文件夹后，将母文件夹也删除
                fs.rmdirSync(fileUrl);
                console.log('删除空文件夹'+fileUrl+'成功');
            }
        }else{
            fs.rmdirSync(fileUrl);
            console.log('删除空文件夹'+fileUrl+'成功');
        }
    }
    
    var rootFile =  process.cwd() + '/public/uploads/'  + req.query.doc_path;
    fs.exists(rootFile, function (exists) {
        if(exists){
            emptyDir(rootFile);
            rmEmptyDir(rootFile);
            res.send({errno:0,errmsg:''});
        }else{
            res.send({errno:0,errmsg:''});
        }
    });
});

module.exports = router;