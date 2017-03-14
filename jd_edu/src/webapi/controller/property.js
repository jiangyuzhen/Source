'use strict';

import Base from './base.js';

export default class extends Base {
    /**
     * index action
     * @return {Promise} []
     */
    indexAction() {
        return this.display();
    }

    //获取属性类别
    async getproptypeAction() {
        let data = await this.model('prop_type').order("sort_no ASC,ptype_id ASC").select({ where: this.get() });
        this.success(data);
    }

    //获取选择属性类别
    async getproptypeselectAction() {
        let organ_id = this.get('organ_id');
        let ptypes = this.get('ptypes');
        let where = "";
        if (!think.isEmpty(ptypes)) {
            where += " and ptype_id not in (" + ptypes + ")";
        }

        let sql = " select ptype_id,ptype_name,sort_no from prop_type where organ_id = " + organ_id +
            " and data_type = 0" +
            " and is_apply = 0" +
            where +
            " order by sort_no";

        let data = await this.model('prop_type').query(sql);
        this.success(data);
    }

    //获取指定对象的属性项目
    async gettargetproptypeAction() {
        let target_id = this.get("target_id");
        let sql = ["select pt.ptype_id,pt.ptype_name,pt.data_type,ptt.required",
            "from prop_type_target ptt join prop_type pt on ptt.ptype_id = pt.ptype_id",
            "where ptt.target_id = " + target_id,
            "order by IFNULL(pt.is_apply,0),pt.sort_no asc,pt.ptype_id asc"
        ];
        let data = await this.model('prop_type_target').query(sql.join(' '));
        this.success(data);
    }

    //获取指定对象属性
    async getpropvalueAction() {
        let target_id = this.get("target_id");
        let key_id = this.get("key_id");
        let data = await this.model('prop_value')
            .alias('p')
            .join('property pt on p.prop_id = pt.prop_id')
            .field('p.ptype_id,p.prop_id,p.num_value,p.text_value,pt.prop_name')
            .select({
                where: {
                    target_id: target_id,
                    key_id: key_id
                }
            });

        this.success(data);
    }

    //获取属性
    async getpropertyAction() {
        let data = await this.model('property').select({ where: this.get() });
        this.success(data);
    }

    //获取属性对象(*)
    async getproptypetargetAction() {
        let ptype_id = this.get("ptype_id");
        let is_only_apply = this.get("is_only_apply")||0;
        let where = '';
        if(is_only_apply == 1){
            where = " and IFNULL(apply_ptype_id,0) = 0 ";
        }
        let sql = " select s.*,p.ptype_id,IFNULL(p.required,-1) as required from sys_target s " +
            " LEFT OUTER JOIN (select * from prop_type_target where prop_type_target.ptype_id = " +
            ptype_id + ") p on s.target_id = p.target_id where 1 = 1 " + where + " order by s.target_id ";
        let data = await this.model('prop_type_target').query(sql);
        this.success(data);
    }

    //获取属性类别对象列表(*)
    async getproptypetargetlistAction() {
        let is_apply = this.get("is_apply")||0;
        //先获取系统对象
        let target = await this.model('sys_target').select();
        let sql = " select *,";
        for (let item of target) {
            sql += "(select required from prop_type_target p where p.ptype_id = prop_type.ptype_id and p.target_id = " + item.target_id + ") as target_id_" + item.target_id + ",";
        }
        sql += '1 from prop_type where is_apply = ' + is_apply + ' order by sort_no ASC,ptype_id ASC';

        let data = await this.model('prop_type').query(sql);
        this.success(data);
    }

    //获取属性选择器
    async getpropertyselectorAction() {
        let offset = this.get('offset');
        let limit = this.get('limit');
        let ptype_id = this.get("ptype_id");
        let search = this.get("search");
        let target_id = this.get('target_id');
        let choosedprop = this.get('choosedprop');
        let where = "ptype_id = " + ptype_id + " and 1 = 1 ";

        if (!think.isEmpty(search)) {
            where = where + " and prop_name like '%" + search + "%'";
        }

        //判断是否需要增加关联提取条件
        if (!think.isEmpty(target_id) && !think.isEmpty(choosedprop)) {
            //检查属性类别是否是对象选择中的第一个，如果是，则不增加关联条件
            let sql = "select p.ptype_id from prop_type p,prop_type_target pt where p.ptype_id = pt.ptype_id  and pt.target_id = 1 order by p.sort_no limit 1";
            let data = await this.model("prop_type").query(sql);
            if (ptype_id != data[0].ptype_id) {
                //根据选择的ID逐条判断path_id的路径中是否包含响应的relate_id
                //提取关联条件
                choosedprop = JSON.parse(choosedprop);
                let relate_ids = '';
                for (let item of choosedprop) {
                    sql = "select DISTINCT r.relate_id from relate_detail_child r,relate b,property p,relate_target rt " +
                        "where r.ptype_id = p.ptype_id " +
                        " and r.relate_id = b.relate_id " +
                        " and r.relate_id = rt.relate_id " +
                        " and rt.target_id = " + target_id +
                        " and p.prop_id = " + item.prop_id +
                        " and p.path_id like CONCAT('%|',r.prop_id,'%')";
                    if (relate_ids.length > 0) {
                        sql += " and r.relate_id in (" + relate_ids + ")";
                    }
                    data = await this.model("prop_type").query(sql);
                    relate_ids = '';
                    for (let item of data) {
                        if (relate_ids.length > 0) relate_ids += ",";
                        relate_ids += item.relate_id;
                    }
                }

                if (relate_ids.length > 0) {
                    //判断关联设置中是否存在相应的属性类别
                    sql = "select 1 from relate_detail_child where relate_id in (" + relate_ids + ") and ptype_id = " + ptype_id;
                    data = await this.model("prop_type").query(sql);
                    if (data.length > 0) {
                        where = where + " and prop_id in (select p.prop_id from relate_detail_child rd,property p " +
                            " where rd.relate_id in (" + relate_ids + ") " +
                            " and rd.ptype_id = " + ptype_id + " and p.ptype_id = " + ptype_id + " and p.path_id like CONCAT('%|',rd.prop_id,'%'))";
                    }
                }
            }
        }

        let data = await this.model('property')
            .field("prop_id,prop_name,parent_id,path_name")
            .limit(offset, limit)
            .where(where)
            .countSelect();

        let json = {
            total: data.count,
            rows: data.data
        };

        this.success(json);
    }

    //获取属性树(*)
    async getpropertyztreeAction() {
        let ptype_id = this.get("ptype_id");
        let target_id = this.get('target_id');
        let choosedprop = this.get('choosedprop');
        let detail_id = this.get('detail_id');
        let bill_id = this.get('bill_id');
        let where = '';
        let sql = "";

        //判断是否需要增加关联提取条件
        if (!think.isEmpty(target_id) && !think.isEmpty(choosedprop)) {
            choosedprop = JSON.parse(choosedprop);

            //增加对应用目录属性提取
            let apply_data = await this.model("sys_target").select({ where: { apply_ptype_id: ptype_id } });
            if (apply_data.length > 0) {
                let apply_target_id = apply_data[0].target_id;
                //判断是否需要增加关联提取条件

                let bill_ids = '';
                for (let item of choosedprop) {
                    sql = "select DISTINCT pv.key_id from prop_value pv,property p" +
                        " where pv.ptype_id = p.ptype_id " +
                        " and pv.target_id = " + apply_target_id +
                        " and p.prop_id = " + item.prop_id +
                        " and p.path_id like CONCAT('%|',pv.prop_id,'%')";

                    //将上一次查找到的key_id带入条件中
                    if (bill_ids.length > 0) {
                        sql += " and pv.key_id in (" + bill_ids + ")";
                    }

                    data = await this.model("prop_value").query(sql);
                    let tmp_ids = '';

                    for (let item of data) {
                        if (tmp_ids.length > 0) tmp_ids += ",";
                        tmp_ids += item.key_id;
                    }
                    if (tmp_ids.length > 0) bill_ids = tmp_ids
                }

                //如果最终找到应用目录则带入最终的条件
                if (bill_ids.length > 0) {
                    where = where + " and bill_id in (" + bill_ids.split(',')[0] + ") ";
                } else {
                    //如果没有合适的应用目录则不提取数据
                    where = " and 1 = 0 ";
                }

                sql = " select p.prop_id as id,p.parent_id as pId,p.prop_name as name,'false' as checked,path_name" +
                    " from property p " +
                    " where 1 = 1 " + where +
                    " order by parent_id,sort_no ";
            } else {
                //检查属性类别是否是对象选择中的第一个，如果是，则不增加关联条件
                sql = "select p.ptype_id from prop_type p,prop_type_target pt " +
                    " where p.ptype_id = pt.ptype_id  and pt.target_id = " + target_id + " order by p.sort_no limit 1";
                let data = await this.model("prop_type").query(sql);

                if (ptype_id != data[0].ptype_id) {
                    //根据选择的ID逐条判断path_id的路径中是否包含响应的relate_id
                    let relate_ids = '';
                    for (let item of choosedprop) {
                        sql = "select DISTINCT r.relate_id from relate_detail_child r,relate b,property p,relate_target rt " +
                            "where r.ptype_id = p.ptype_id " +
                            " and r.relate_id = b.relate_id " +
                            " and rt.relate_id = b.relate_id " +
                            " and rt.target_id = " + target_id +
                            " and p.prop_id = " + item.prop_id +
                            " and p.path_id like CONCAT('%|',r.prop_id,'%')";
                        if (relate_ids.length > 0) {
                            sql += " and r.relate_id in (" + relate_ids + ")";
                        }
                        data = await this.model("prop_type").query(sql);
                        relate_ids = '';
                        for (let item of data) {
                            if (relate_ids.length > 0) relate_ids += ",";
                            relate_ids += item.relate_id;
                        }
                    }

                    if (relate_ids.length > 0) {
                        //判断关联设置中是否存在相应的属性类别
                        sql = "select 1 from relate_detail_child where relate_id in (" + relate_ids + ") and ptype_id = " + ptype_id;
                        data = await this.model("prop_type").query(sql);
                        if (data.length > 0) {
                            where = where + " and prop_id in (select p.prop_id from relate_detail_child rd,property p " +
                                " where rd.relate_id in (" + relate_ids + ") " +
                                " and rd.ptype_id = " + ptype_id + " and p.ptype_id = " + ptype_id + " and p.path_id like CONCAT('%|',rd.prop_id,'%'))";
                        }
                    }
                }

                sql = " select prop_id as id,parent_id as pId,prop_name as name,path_name" +
                    " from property where ptype_id = " + ptype_id + where +
                    " order by parent_id,sort_no ";
            }
        } else {
            sql = " select prop_id as id,parent_id as pId,prop_name as name,path_name" +
                " from property where ptype_id = " + ptype_id + where +
                " order by parent_id,sort_no ";
        }

        if (!think.isEmpty(detail_id)) {
            sql = " select p.prop_id as id,p.parent_id as pId,p.prop_name as name,case when isnull(c.prop_id) = 1 then 'false' else 'true' end as checked,path_name" +
                " from property p left outer join relate_detail_child c on p.path_id like CONCAT('%|',c.prop_id,'%') and c.detail_id=" + detail_id +
                " where p.ptype_id = " + ptype_id +
                " order by parent_id,sort_no ";
        }

        if (!think.isEmpty(bill_id)) {
            sql = " select p.prop_id as id,p.parent_id as pId,p.prop_name as name,'false' as checked,path_name" +
                " from property p " +
                " where p.bill_id = " + bill_id +
                " order by parent_id,sort_no ";
        }

        let data = await this.model('property').query(sql);
        this.success(data);
    }

    //更新属性树序号
    async updatepropertysortnoAction() {
        let sort_data = this.post('data');
        if (think.isEmpty(sort_data)) return this.fail('参数不能为空!');
        sort_data = JSON.parse(sort_data);
        let data = [];
        for (let v of sort_data) {
            let map = {};
            map['prop_id'] = v.prop_id;
            map.sort_no = v.sort_no;
            data.push(map)
        }
        let res = await this.model("property").updateMany(data);
        this.success(data);
    }

    /**
     * 新增/修改属性类别(*)
     */
    async updateproptypeAction() {
        let parm_ptype_id = this.post("ptype_id");
        let parm_ptype_name = this.post("ptype_name") || '';
        let parm_data_type = this.post("data_type") || 0;
        let parm_sort_no = this.post("sort_no") || 0;
        let is_apply = this.post("is_apply") || 0;
        if (think.isEmpty(parm_ptype_name)) return this.fail("参数不能为空");
        if (think.isEmpty(parm_data_type)) return this.fail("参数不能为空");

        //获取当先的模型信息
        let model = await this.model("prop_type");
        let returnId;
        if (think.isEmpty(parm_ptype_id)) {
            returnId = await model.add({
                ptype_name: parm_ptype_name,
                organ_id: 0,
                data_type: parm_data_type,
                sort_no: parm_sort_no,
                is_apply: is_apply
            });

            //应用目录同步写入系统对象表sys_target
            if (is_apply == 1) {
                await this.model("sys_target").add({
                    target_id: returnId,
                    target_name: parm_ptype_name,
                    apply_ptype_id: returnId
                });
            }
        } else {
            returnId = await model.update({
                ptype_name: parm_ptype_name,
                data_type: parm_data_type,
                sort_no: parm_sort_no
            }, { where: { ptype_id: parm_ptype_id } });

            //应用目录同时更新系统对象中的名称
            if (is_apply == 1) {
                await this.model("sys_target").update({ target_name: parm_ptype_name }, { where: { apply_ptype_id: parm_ptype_id } });
            }

        }

        await this.updatesystargetprophtml();

        return this.success({ ptype_id: returnId });
    }

    //获取系统对象属性输入界面(*)
    async getsystargetprophtmlAction() {
        let target_id = this.get('target_id');
        let apply_ptype_id = this.get('apply_ptype_id');

        let where = {};
        if (!think.isEmpty(target_id)) {
            where.target_id = target_id;
        }

        if (!think.isEmpty(apply_ptype_id)) {
            where.apply_ptype_id = apply_ptype_id;
        }

        let data = await this.model('sys_target').field("prop_html,target_id").select({ where: where });
        return this.success(data);
    }

    async updatesystargetprophtml() {
        //重新生成sys_target.prop_html        
        let sys_target = await this.model('sys_target').select();

        for (let item of sys_target) {
            let sql = ["select pt.ptype_id,pt.ptype_name,pt.data_type,ptt.required",
                "from prop_type_target ptt join prop_type pt on ptt.ptype_id = pt.ptype_id",
                "where ptt.target_id = " + item.target_id,
                "order by pt.is_apply,pt.sort_no asc,pt.ptype_id asc"
            ];
            let data = await this.model('prop_type_target').query(sql.join(' '));
            let html = "";
            let html_type = '';

            for (let value of data) {
                let html_required = '';
                html += '<div class="form-group" data_type="' + value.data_type + '">';
                html += '<label class="col-sm-2 control-label label_ptype_id_' + value.ptype_id + '">' + value.ptype_name + html_required + ':</label>';
                html += '<div class="col-sm-10">';

                //如果数目录类型的属性，则添加为属性选择器
                if (value.data_type == 0) {
                    html += '<div class="prop-chosen-container">';
                    html += '<ul class="prop-chosen-choices" ptype_id="' + value.ptype_id + '">';
                    html += '<li class="prop-chosen-add" add_ptype_id="' + value.ptype_id + '"></li>';
                    html += '</ul></div>';
                    html_type = 'hidden';
                }
                //非目录类型的属性添加为普通输入框
                else {
                    html_type = 'text';
                }
                html += '<input id="ptype_id_' + value.ptype_id +
                    '" class="form-control" name="' + value.ptype_id +
                    '" type="' + html_type +
                    '" data_type="' + value.data_type +
                    '" choose_required="' + value.required + '">';
                html += '</div></div>';
            }

            if (item.target_id == 1) {
                //知识点
                html += '<div class="form-group" data_type="0">' +
                    '<label class="col-sm-2 control-label label_ptype_id_k">知识点:</label>' +
                    '<div class="col-sm-10">' +
                    '<div class="prop-chosen-container">' +
                    '<ul class="prop-chosen-choices" ptype_id="k">' +
                    '<li class="prop-chosen-add" add_ptype_id="k"></li>' +
                    '</ul>' +
                    '</div>' +
                    '<input id="ptype_id_k" class="form-control" name="k" type="hidden" data_type="0" choose_required="1">' +
                    '</div>' +
                    '</div>'
            }
            await this.model('sys_target').update({ prop_html: html }, { where: { target_id: item.target_id } });
        }
    }

    async updateproptypetargetAction() {
            let post = this.post();
            let parm_ptype_id = post.ptype_id;
            if (think.isEmpty(parm_ptype_id)) return this.fail("参数不能为空");
            if (think.isEmpty(post.data)) return this.fail("参数不能为空");

            let jsobj = JSON.parse(post.data);
            let model = await this.model("prop_type_target");

            try {
                await model.delete({ where: { ptype_id: parm_ptype_id } });

                for (let i of jsobj) {
                    if (i.ptype_id) {
                        await model.add(i);
                    }
                }

                await this.updatesystargetprophtml();

                return this.success('保存成功!');
            } catch (e) {
                return this.fail('服务端异常!');
            }
        }
        /**
         * 新增/修改属性
         */
    async updatepropertyAction() {
        let parm_ptype_id = this.post("ptype_id");
        let parm_parent_id = this.post("parent_id");
        let parm_prop_id = this.post("prop_id");
        let parm_prop_name = this.post("prop_name");
        let bill_id = this.post("bill_id");

        if (think.isEmpty(parm_ptype_id)) return this.fail("参数不能为空");
        if (think.isEmpty(parm_prop_name)) return this.fail("参数不能为空");

        if (think.isEmpty(parm_ptype_id)) parm_parent_id = 0;
        //获取当先的模型信息
        let model = await this.model("property");
        let path_id = '';
        let path_name = '';
        let parent = await model.find({ where: { prop_id: parm_parent_id } });

        if (!think.isEmpty(parent)) {
            path_id = parent.path_id;
            path_name = parent.path_name;
        }

        try {
            await model.startTrans();
            //新增
            if (think.isEmpty(parm_prop_id)) {
                parm_prop_id = await model.add({
                    ptype_id: parm_ptype_id,
                    prop_name: parm_prop_name,
                    parent_id: parm_parent_id,
                    path_id: path_id,
                    bill_id: bill_id,
                    depth: parent.depth + 1
                });

                await model.update({
                    path_id: path_id + "|" + parm_prop_id,
                    path_name: path_name + "->" + parm_prop_name
                }, {
                    where: {
                        prop_id: parm_prop_id
                    }
                });
            }
            //修改 
            else {
                await model.update({
                    prop_name: parm_prop_name
                }, {
                    where: {
                        prop_id: parm_prop_id
                    }
                });
            }
            //处理full_name
            let data = await model.find({ where: { prop_id: parm_prop_id } });
            let depth_data = await model.query("select distinct depth from property where path_id like '" + data.path_id + "%' order by depth");

            for (let item of depth_data) {
                let exec_sql = "update property a left join property b on a.parent_id = b.prop_id " +
                    "set a.path_name = CONCAT(IFNULL(b.path_name,''),case when IFNULL(b.path_name,'') <> '' then '->' else '' end ,a.prop_name)" +
                    "where a.path_id like '" + data.path_id + "%' and a.depth = " + item.depth;
                await model.execute(exec_sql);
            }

            await model.commit();
        } catch (e) {
            await model.rollback();
            return this.fail('服务端异常');
        }

        return this.success({ prop_id: parm_prop_id });
    }

    //重新生成所有属性的路径path_name值(*)
    async dealwithpathnameAction() {
        try {
            //处理属性根节点的path_name
            await this.model("property").execute("update property set path_name = prop_name where parent_id = 0 and path_name <> prop_name");

            //提取根属性类别
            let prop_type = await this.model("prop_type").query("select ptype_id from prop_type where data_type = 0 ");
            for (let ptype of prop_type) {
                //提取根节点的path_id
                let root_props = await this.model("property").query(" select path_id from property where ptype_id = " + ptype.ptype_id + " and parent_id = 0");
                for (let prop of root_props) {
                    //提取属性深度                
                    let depth_data = await this.model('property').query("select distinct depth from property where path_id like '" + prop.path_id + "%' order by depth");
                    for (let item of depth_data) {
                        //更新path_name
                        let exec_sql = "update property a left join property b on a.parent_id = b.prop_id " +
                            "set a.path_name = CONCAT(IFNULL(b.path_name,''),case when IFNULL(b.path_name,'') <> '' then '->' else '' end ,a.prop_name)" +
                            "where a.path_id like '" + prop.path_id + "%' and a.depth = " + item.depth;
                        await this.model('property').execute(exec_sql);
                    }
                }
            }
            return this.success('保存成功!');
        } catch (e) {
            return this.fail('服务端异常!');
        }
    }

    //删除属性类别(*)
    async delproptypeAction() {
        let parm_ptype_id = this.post("ptype_id") || '';
        if (think.isEmpty(parm_ptype_id)) return this.fail("参数不能为空");

        //检查属性类别是否已经使用了
        let count = await this.model('property').where({ ptype_id: parm_ptype_id }).count('prop_id');
        if (count > 0) {
            return this.fail('当前属性类别已经存在数据，不能删除!');
        }

        let model = await this.model("prop_type");
        let ret = await model.delete({ where: { ptype_id: parm_ptype_id } });

        //如果是应用目录类别还需删除相应的对象
        let exec_sql = "delete from prop_type_target where target_id in (select target_id from sys_target where apply_ptype_id = " + parm_ptype_id + ")";
        await model.execute(exec_sql);

        exec_sql = "delete from sys_target where apply_ptype_id = " + parm_ptype_id;
        await model.execute(exec_sql);

        return this.success(ret);
    }

    //删除属性
    async delpropertyAction() {
        let prop_id = this.post("prop_id");
        if (think.isEmpty(prop_id)) return this.fail("参数不能为空");
        let model = await this.model("property");

        //检查下级属性是否为空
        let count = await model.where({ parent_id: prop_id }).count('prop_id');
        if (count > 0) {
            return this.fail('存在下级知识点内容，不能删除当前节点!');
        }
        //检查属性是否已经使用了
        count = await this.model('prop_value').where({ prop_id: prop_id }).count('prop_id');
        if (count > 0) {
            return this.fail('当前属性已经被使用，不能删除!');
        }

        let ret = await model.delete({ where: { prop_id: prop_id } });
        return this.success(ret);
    }

    //更新属性类别顺序号(*)
    async updateproptypesortnoAction() {
        let sort_no_list = this.post('sort_no_list');

        if (think.isEmpty(sort_no_list)) return this.fail('参数不能为空!');

        sort_no_list = JSON.parse(sort_no_list);

        for (let v of sort_no_list) {
            await this.model("prop_type").update({ sort_no: v.sort_no }, { where: { ptype_id: v.ptype_id } });
        }

        this.success();
    }

    //获取应用目录(*)
    async querypropbillAction() {
        let organ_id = this.get('organ_id');
        let ptype_id = this.get('ptype_id');
        if (think.isEmpty(organ_id)) return this.fail("organ_id参数不能为空");
        if (think.isEmpty(ptype_id)) return this.fail("ptype_id参数不能为空");

        let offset = this.get('offset');
        let limit = this.get('limit');

        let where = ' ptype_id = ' + ptype_id;

        think.log("where->" + where);
        let data = await this.model('prop_bill').alias('q').join([
                "sys_operator s ON q.opr_id=s.opr_id"
            ]).field("q.*,s.opr_name")
            .limit(offset, limit)
            .where(where)
            .countSelect();

        let json = {
            total: data.count,
            rows: data.data
        };

        this.success(json);
    }

    //新增，修改应用目录纲要(*)
    async updatepropbillAction() {

        let target_id = this.post("target_id");
        let ptype_id = this.post("ptype_id");
        let bill_id = this.post("bill_id");
        let organ_id = this.post("organ_id");
        let bill_name = this.post("bill_name");
        let opr_id = this.post("opr_id");
        let opr_times = this.post("opr_times") || 0;
        let opr_date = think.datetime();
        let props = this.post("props");

        if (think.isEmpty(ptype_id)) return this.fail("ptype_id参数不能为空");
        if (think.isEmpty(target_id)) return this.fail("target_id参数不能为空");
        if (think.isEmpty(organ_id)) return this.fail("organ_id参数不能为空");
        if (think.isEmpty(bill_name)) return this.fail("bill_name参数不能为空");
        if (think.isEmpty(opr_id)) return this.fail("opr_id参数不能为空");
        if (think.isEmpty(opr_times)) return this.fail("opr_times参数不能为空");

        //题目数据
        let data = {
            organ_id: organ_id,
            ptype_id: ptype_id,
            bill_name: bill_name,
            opr_id: opr_id,
            opr_date: opr_date,
            opr_times: opr_times
        };

        let model_prop_bill = await this.model('prop_bill');
        let model_prop_value = await this.model("prop_value").db(model_prop_bill.db());

        if (think.isEmpty(bill_id)) {
            let count = await model_prop_bill.where({ bill_name: bill_name }).count('bill_id');
            if (count > 0) {
                return this.fail('对不起，该名称的应用目录已经存在!');
            }
        }

        try {
            await model_prop_bill.startTrans();

            //删除相关表数据
            if (!think.isEmpty(bill_id)) {
                await model_prop_value.delete({
                    where: {
                        target_id: target_id,
                        key_id: bill_id
                    }
                });
            }

            if (think.isEmpty(bill_id)) {
                bill_id = await model_prop_bill.add(data); //新增 
            } else {
                await model_prop_bill.update(data, { where: { bill_id: bill_id } }); //修改
            }

            //属性数据
            let prop_datas = [];

            if (!think.isEmpty(props)) {
                props = JSON.parse(props);
                for (let v of props) {
                    prop_datas.push(think.extend({ key_id: bill_id }, v));
                }

                //添加属性
                await model_prop_value.addMany(prop_datas);
            }

            await model_prop_bill.commit();
        } catch (e) {
            think.log(e);
            await model_prop_bill.rollback();
            return this.fail("保存失败!");
        }

        return this.success({ bill_id: bill_id });
    }


    //删除应用目录纲要(*)
    async delpropbillAction() {
        let bill_id = this.post("bill_id");
        let target_id = this.post("target_id");

        if (think.isEmpty(bill_id)) return this.fail("bill_id参数不能为空");
        if (think.isEmpty(target_id)) return this.fail("target_id参数不能为空");

        let count = await this.model('property').where({ bill_id: bill_id }).count('prop_id');
        if (count > 0) {
            return this.fail('该目录下已经存在属性，不能删除!');
        }

        await this.model('prop_bill').delete({ where: { bill_id: bill_id } });
        await this.model('prop_value').delete({ where: { target_id: target_id, key_id: bill_id } });
        this.success();
    }
}