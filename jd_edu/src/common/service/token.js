'use strict';
//引入jwt
let jwt = require("jwt-simple");
//读取secret标记码
let secret = think.config("hello.secret");

export default class extends think.service.base {
	/**
	 * @description 创建token
	 * @param {Object} userinfo 用户信息
	 * @return 返回token
	 */
	createToken(userinfo) {
		let d = new Date();
		d.setHours(d.getHours() + 24);		//令牌有效期24小时
		let expires = d.valueOf();
		let result = jwt.encode({ iss: userinfo, exp: expires }, secret);
		return result;
	}

	/**
	 * @description 验证票据
	 * @param {Object} token 用户请求token
	 * @return 返回 错误或者解密过的token
	 */
	verifyToken(token) {
		if (token) {
			try {
				let result = jwt.decode(token, secret);
				if (result.exp < Date.now()) {
					return "expired";
				}
				return result;
			} catch (err) {
				//票据验证失败,需要提示需要重新登录
				return "fail";
			}
		}
		return "fail";
	}
}