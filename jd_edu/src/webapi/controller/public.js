'use strict';

import Base from './base.js';

export default class extends Base {
    /** 
     * 用户登录
     * @return {Promise} []
     */
    async loginAction() {
        think.log('this.post()');
        think.log(this.post());

        //获取post参数
        let username = this.post('username');
        let password = this.post('password');

        password = encryptPassword(password);
        let res = await this.model("sys_operator").signin(username, password, this.ip(), 6, 1);
        if (0 < res.uid) {
            //调用tokenservice中间件
            let tokenService = think.service("token");
            let tokenServiceInstance = new tokenService();
            //写入token
            let token = await tokenServiceInstance.createToken({
                userInfo: {
                    id: res.uid,
                    name: res.username
                }
            });

            let ret = {
                "token": token,
                "userid": res.uid,
                "username": res.username,
                "organ_id": res.organ_id,
                "yx_accid":res.yx_accid,
                "yx_token":res.yx_token
            };

            //传输客户端token
            return this.success(ret);
        }
        return this.fail("用户名或密码错误!");
    }

    //获取系统角色
    async getsysroleAction() {
        let data = await this.model('sys_role').order("role_id ASC").select();
        this.success(data);
    }

    /**
     * 新增/修改系统角色
     */
    async updatesysroleAction() {
        let parm_role_id = this.post("role_id");
        let parm_role_name = this.post("role_name") || '';

        if (think.isEmpty(parm_role_name)) return this.fail("参数不能为空");

        let model = await this.model("sys_role");
        let returnId;
        if (think.isEmpty(parm_role_id)) {
            returnId = await model.add({
                role_name: parm_role_name,
                organ_id: 0,
                app_id: 0
            });
        } else {
            returnId = await model.update({
                role_name: parm_role_name
            }, { where: { role_id: parm_role_id } });
        }
        return this.success({ role_id: returnId });
    }

    //删除系统角色
    async delsysroleAction() {
        let role_id = this.post("role_id") || '';
        if (think.isEmpty(role_id)) return this.fail("参数不能为空");

        let data = await this.model("sys_operator").select({ where: { role_id: role_id } });

        if (data.length > 0) {
            return this.fail("该角色已经被使用，禁止删除!");
        }

        let ret = await this.model("sys_role").delete({ where: { role_id: role_id } });
        return this.success(ret);
    }

    //获取角色功能树 
    async getsysrolefuncAction() {
        let role_id = this.get("role_id");
        let sql = " select func_id as id,parent_id as pId,func_name as name," +
            " ifnull((select 'true' from role_func r where r.func_id = sys_func.func_id and role_id = " + role_id + "),'false') as checked" +
            " from sys_func order by sort_no ";
        let data = await this.model('sys_func').query(sql);
        this.success(data);
    }

    //获取角色功能菜单 
    async getoprmenuAction() {
        let opr_id = this.get("opr_id");
        if (think.isEmpty(opr_id)) return this.fail("opr_id参数不能为空");

        let sql = " select func_id as id,parent_id as pId,func_name as name,url,img," +
            " ifnull((select 'true' from role_func r,sys_operator o " +
            " where r.func_id = sys_func.func_id " +
            " and r.role_id = o.role_id " +
            " and o.opr_id = " + opr_id + "),'false') as checked" +
            " from sys_func order by sort_no";
        let data = await this.model('sys_func').query(sql);
        this.success(data);
    }

    //获取操作员最后一次输入的属性内容
    async getoprlastinputAction() {
        let target_id = this.get('target_id');
        let opr_id = this.get('opr_id');
        let paper_id = this.get('paper_id');

        if (think.isEmpty(target_id)) return this.fail("参数不能为空");
        if (think.isEmpty(opr_id)) return this.fail("参数不能为空");

        let sql = "select o.ptype_id,o.prop_id, " +
            " 		case when o.ptype_id = 'k' then k.value else p.prop_name end as prop_name, " +
            " 		case when o.ptype_id = 'k' then k.path_name else p.path_name end as path_name,"+
            "       o.text_value,0 as hide " +
            " from operator_target_input o  " +
            " left outer join property p on o.prop_id = p.prop_id " +
            " left outer join knowledge k on o.ptype_id = 'k' and o.prop_id = k.kid " +
            " where o.target_id = " + target_id + " and o.opr_id = " + opr_id;

        let data = await this.model('operator_target_input').query(sql);

        //如果存在试卷id则提取试卷的属性
        if (!think.isEmpty(paper_id)) {
            sql = "select o.ptype_id,o.prop_id,p.prop_name,p.path_name,o.text_value,0 as hide " +
                " from prop_value o  " +
                " left outer join property p on o.prop_id = p.prop_id " +
                " where o.target_id = 2 and o.key_id = " + paper_id + " and p.prop_name is not null";

            let pdata = await this.model('operator_target_input').query(sql);

            for(let pitem of pdata) {
                for(let i in data){
                    if (pitem.ptype_id == data[i].ptype_id){
                        data[i].prop_id = pitem.prop_id;
                        data[i].prop_name = pitem.prop_name;
                        data[i].path_name = pitem.path_name;
                        data[i].text_value = pitem.text_value;
                        data[i].hide = 1;
                    }
                }
            }
        }
        this.success(data);
    }

    //获取系统角色
    async getsysoperatorAction() {
        let organ_id = this.get("organ_id");

        let data = await this.model('sys_operator')
            .alias("s")
            .join("sys_role r on s.role_id = r.role_id")
            .field("s.*,r.role_name")
            .where("s.deleted = 0 and s.organ_id = " + organ_id)
            .select();
        this.success(data);
    }

    /**
     * 新增/修改操作员
     */
    async updatesysoperatorAction() {
        let opr_id = this.post("opr_id");
        let opr_name = this.post("opr_name") || '';
        let role_id = this.post("role_id");
        let organ_id = this.post("organ_id");
        let tel = this.post("tel");
        let email = this.post("email");
        let real_name = this.post("real_name");
        let password = this.post("password");
        think.log(this.post());

        if (think.isEmpty(opr_name)) return this.fail("opr_name参数不能为空");

        let model = await this.model("sys_operator");
        let returnId;
        if (think.isEmpty(opr_id)) {
            password = encryptPassword(password);
            returnId = await model.add({
                opr_name: opr_name,
                role_id: role_id,
                organ_id: organ_id,
                tel: tel,
                email: email,
                real_name: real_name,
                opr_password: password,
                deleted: 0
            });
        } else {
            returnId = await model.update({
                opr_name: opr_name,
                role_id: role_id,
                organ_id: organ_id,
                tel: tel,
                email: email,
                real_name: real_name
            }, { where: { opr_id: opr_id } });
        }
        return this.success({ role_id: returnId });
    }

    //删除操作员
    async delsysoperatorAction() {
        let opr_id = this.post("opr_id") || '';
        if (think.isEmpty(opr_id)) return this.fail("参数不能为空");

        let ret = await this.model("sys_operator").update({ deleted: 1 }, { where: { opr_id: opr_id } });
        return this.success(ret);
    }


    /**
     * 更新操作员云信id
     */
    async updatesysoperatoryxAction() {
        let opr_id = this.post("opr_id");
        let yx_accid = this.post("yx_accid");
        let yx_token = this.post("yx_token");


        if (think.isEmpty(opr_id)) return this.fail("opr_id参数不能为空");
        if (think.isEmpty(yx_accid)) return this.fail("yx_accid参数不能为空");
        if (think.isEmpty(yx_token)) return this.fail("yx_token参数不能为空");


        let model = await this.model("sys_operator");
        let returnId;

            returnId = await model.update({
                yx_accid: yx_accid,
                yx_token: yx_token
            }, { where: { opr_id: opr_id } });

        return this.success();
    }
    
    //修改操作员密码
    async sysoprchangpwdAction() {
        let opr_id = this.post("opr_id");
        let old_pwd = this.post("old_pwd");
        let new_pwd = this.post("new_pwd");

        if (think.isEmpty(opr_id)) return this.fail("参数不能为空");
        if (think.isEmpty(old_pwd)) return this.fail("参数不能为空");

        old_pwd = encryptPassword(old_pwd);

        let data = await this.model("sys_operator").where({ opr_id: opr_id, opr_password: old_pwd }).find();
        if (think.isEmpty(data)) {
            return this.fail("原密码不正确!");
        }

        new_pwd = encryptPassword(new_pwd);
        await this.model("sys_operator").update({ opr_password: new_pwd }, { where: { opr_id: opr_id } });

        return this.success();
    }

    /**
     * 更新角色权限
     */
    async updaterolefuncAction() {
        let role_id = this.post("role_id");
        let role_func = this.post("role_func");

        if (think.isEmpty(role_id)) return this.fail("参数不能为空");

        let model = await this.model("role_func");

        await model.delete({ where: { role_id: role_id } });

        let datas = [];
        if (!think.isEmpty(role_func) && role_func != "[]") {
            role_func = JSON.parse(role_func);
            for (let v of role_func) {
                datas.push({
                    role_id: v.role_id,
                    func_id: v.func_id
                });
            }

            await model.addMany(datas);
        }

        return this.success({ role_id: role_id });
    }
}