var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var ueditor = require("ueditor");
var proxy = require('express-http-proxy');

var admin = require('./routes/admin');
var upload = require('./routes/upload');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use('/JDEdu/*', proxy("http://www.yunxue365.cn:8080/JDEdu", {
  reqBodyEncoding: null,
  forwardPath: function(req, res) {
    return req.originalUrl;
  }
}));
// app.use('/JDEdu/*', proxy("http://hezs.tunnel.qydev.com/JDEdu", {
//   reqBodyEncoding: null,
//   forwardPath: function(req, res) {
//     return req.originalUrl;
//   }
// }));

// uncomment after placing your favicon in /public
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//ueditor图片上传路径处理
app.use("/admin/js/plugins/ueditor/ue", ueditor(path.join(__dirname, 'public'), function(req, res, next) {
	// ueditor 客户发起上传图片请求
	if(req.query.action === 'uploadimage') {

		// 这里你可以获得上传图片的信息
//		var foo = req.ueditor;
		var img_url = '/admin/images/ueditor/';
		res.ue_up(img_url); //你只要输入要保存的地址 。保存操作交给ueditor来做
	}
	//  客户端发起图片列表请求
	else if(req.query.action === 'listimage') {
		var dir_url = '/admin/images/ueditor/';
		res.ue_list(dir_url) // 客户端会列出 dir_url 目录下的所有图片
	}
	else {
		res.setHeader('Content-Type', 'application/json');
		// 这里填写 ueditor.config.json 这个文件的路径
		res.redirect('/admin/js/plugins/ueditor/nodejs/config.json')
	}
}));

//路由设置
app.use('/admin', admin);
app.use('/teacher',upload);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers
// development error handler
// will print stacktrace
if(app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

module.exports = app;
