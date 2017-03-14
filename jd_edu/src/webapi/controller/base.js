'use strict';
//定义用户数据变量
let user = {};
export default class extends think.controller.base {
    /**
     *@description action请求验证用户token
     */
    async __before(action) {
        //处理跨域访问问题
        this.header("Access-Control-Allow-Origin", "*");
        this.header("Access-Control-Allow-Headers", "x-requested-with,token,content-type");
        this.header("Access-Control-Request-Method", "GET,POST,PUT,DELETE");
        this.header("Access-Control-Allow-Credentials", "true");

        //登录、注册不验证token
        if (this.http.action === 'login') {
            return;
        }

        //登录、注册不验证token
        if (this.http.action === 'dealwithpathname') {
            return;
        }

        //获取http-header token
        let userToken = this.http.header("token");

        //调用tokenservice中间件
        let tokenService = think.service("token");
        let tokenServiceInstance = new tokenService();
        //验证token
        let verifyTokenResult = await tokenServiceInstance.verifyToken(userToken);
        //服务器错误时
        if (verifyTokenResult === "fail") {
            this.fail("TOKEN_INVALID")
        }

        //令牌过期
        if (verifyTokenResult === "expired") {
            this.fail("TOKEN_EXPIRED")
        }

        //获取用户信息
        user = verifyTokenResult.iss;
        //写入新token
        // let newToken = await tokenServiceInstance.createToken({
        // userInfo: verifyTokenResult.userInfo
        // });
        // this.http.header("token", newToken);
    }

    __call() {
            this.fail("无效的控制器");
        }
        //用户信息
    userInfo() {
        return user;
    }
}