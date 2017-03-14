'use strict';
/**
 * model
 */
export default class extends think.model.base {
    /**
     * 用户登录认证
     * @param  string  $username 用户名
     * @param  string  $password 用户密码
     * @param  integer $type     用户名类型 （1-用户名，2-邮箱，3-手机，4-UID）
     * @param  {int} login 登陆方式 0-前台登陆 ， 1-后台登陆
     * @return integer           登录成功-用户ID，登录失败-错误编号
     */
    async signin(username, password, ip, type = 1, login = 0) {
        let map = {};
        switch (type) {
            case 1:
                map.username = username;
                break;
            case 2:
                map.email = username;
                break;
            case 3:
                map.mobile = username;
                break;
            case 4:
                map.id = username;
                break;
            case 5:
                map = {
                    username: username,
                    email: username,
                    mobile: username,
                    _logic: "OR"
                }
                break;
            case 6:
                map.opr_name = username;
                break;
            default:
                return 0; //参数错误
        }

        let user = await this.where(map).find();

        if (!think.isEmpty(user)) {
            /* 验证用户密码 */
            if (password === user.opr_password) {
                let userInfo = {
                    'uid': user.opr_id,
                    'username': user.opr_name,
                    'organ_id': user.organ_id,
                    'last_login_time': user.last_login_time,
                    'yx_accid':user.yx_accid,
                    'yx_token':user.yx_token
                };

                return userInfo; //登录成功，返回用户信息
            } else {
                return -2; //密码错误
            }
        } else {
            return -1; //用户不存在或被禁用
        }
    }
}