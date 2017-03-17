var plugin_path = 'js/plugins/';
var server_url = 'http://127.0.0.1:8361/webapi';
//var server_url = 'http://192.5.0.137:8361/webapi';

var teacher_server_url = "http://hezs.tunnel.qydev.com/JDEdu";
var teacher_id = 12;

window.width = jQuery(window).width();

/* Init */
jQuery(window).ready(function () {
    Init(false);
});

function Init() {
    _toastr(false, false, false, false);
}

function changeToPercent(num) {
    var result = (num * 100).toString(),
        index = result.indexOf(".");
    if (index == -1 || result.substr(index + 1).length <= 4) {
        return result + "%";
    }
    return result.substr(0, index + 5) + "%";
}

function _ajax_post(type, action, parm, success_do) {
    $.ajax({
        type: type,
        url: action,
        headers: {
            token: sessionStorage.getItem('token')
        },
        data: parm,
        error: function (XMLHttpRequest, textStatus, errorThrown) {
            _toastr("error message : " + errorThrown.toString(), "bottom-right", "error", false);
        },
        success: function (ret) {
            if (ret.errno == 0) {
                if (success_do) {
                    success_do(ret.data);
                }
            } else {
                _toastr(ret.errmsg, "bottom-right", "error", false);
            }
        }
    });
}

/** Toastr

 TYPE:
 primary
 info
 error
 success
 warning

 POSITION
 top-right
 top-left
 top-center
 top-full-width
 bottom-right
 bottom-left
 bottom-center
 bottom-full-width

 USAGE:
 _toastr("My Message here","top-right","error",false);

 NOTE:
 _onclick = url to redirect (example: http://www.stepofweb.com)
 **************************************************************** **/
function _toastr(_message, _position, _notifyType, _onclick) {
//	var _btn = $(".toastr-notify");
    if (_message != false) {
        loadScript(plugin_path + 'toastr/toastr.min.js', function () {
            /** JAVSCRIPT / ON LOAD
             ************************* **/
            if (_message != false) {

                if (_onclick != false) {
                    onclick = function () {
                        window.location = _onclick;
                    }
                } else {
                    onclick = null
                }

                toastr.options = {
                    "closeButton": true,
                    "debug": false,
                    "newestOnTop": false,
                    "progressBar": true,
                    "positionClass": "toast-" + _position,
                    "preventDuplicates": false,
                    "onclick": onclick,
                    "showDuration": "300",
                    "hideDuration": "1000",
                    "timeOut": "5000",
                    "extendedTimeOut": "1000",
                    "showEasing": "swing",
                    "hideEasing": "linear",
                    "showMethod": "fadeIn",
                    "hideMethod": "fadeOut"
                }

                setTimeout(function () {
                    toastr[_notifyType](_message);
                }, 0); // delay 1.5s
            }
        });
    }
}

function _toastr_err(_message) {
    _toastr(_message, 'bottom-right', 'error', false);
}

function _toastr_ok(_message) {
    _toastr(_message, 'bottom-right', 'success', false);
}

var _arr = {};

function loadScript(scriptName, callback) {
    if (!_arr[scriptName]) {
        _arr[scriptName] = true;

        var body = document.getElementsByTagName('body')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = scriptName;
        script.onload = callback;
        body.appendChild(script);
    } else if (callback) {
        callback();
    }
};

//通用属性选择器初始化
function initPropChoose(addFunc) {
    //点击删除
    $(".prop-chosen-choices").on("click", "li .prop-search-choice-close", function () {
        var value = $(this).attr("data-value");
        $(".prop-search-choice").remove("[data-value=" + value + "]");
    });

    //弹出添加属性
    $(".prop-chosen-choices").on("click", function (evn) {
        if (!$(evn.target).hasClass('prop-search-choice-close')) {
            addFunc(evn.target);
        }
    });
}

//获取url中的参数
function GetRequest() {
    var url = location.search; //获取url中"?"符后的字串
    var theRequest = new Object();
    if (url.indexOf("?") != -1) {
        var str = url.substr(1);
        strs = str.split("&");
        for (var i = 0; i < strs.length; i++) {
            theRequest[strs[i].split("=")[0]] = unescape(strs[i].split("=")[1]);
        }
    }
    return theRequest;
}

//将数组1添加到数组2后面,并根据keyname去掉其中的重复内容
function concatArray(array1,array2,keyname) {
    for (var i = 0, flag = true, len = array1.length; i < len; flag ? i++ : i) {
        for (var j = 0; j < array2.length; j++) {
            if (array1[i] && array1[i][keyname] == array2[j][keyname]) {
                array1.splice(i, 1);
                flag = false;
                break;
            } else {
                flag = true;
            }
        }
    }

    return array2.concat(array1);
}

//处理日期格式化
Date.prototype.format = function (format) {
    var o = {
        "M+": this.getMonth() + 1, //month
        "d+": this.getDate(), //day
        "h+": this.getHours(), //hour
        "m+": this.getMinutes(), //minute
        "s+": this.getSeconds(), //second
        "q+": Math.floor((this.getMonth() + 3) / 3), //quarter
        "S": this.getMilliseconds() //millisecond
    }

    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }

    for (var k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
        }
    }
    return format;
}
