'use strict';

import Base from './base.js';

export default class extends Base {
    /**
     * index action
     * @return {Promise} []
     */
    indexAction() {
        //auto render template file index_index.html
        return this.display();
    }

    //获取机构
    async getorganAction() {
        let data = await this.model('organ').select();
        this.success(data);
    }

    //获取未审核机构
    async getpreorganAction() {
        let data = await this.model('pre_organ').select();
        this.success(data);
    }

    /**
     * 新增/修改机构
     */
    async updateorganAction() {
        let organ_id = this.post("organ_id");
        let organ_name = this.post("organ_name") || '';
        if (think.isEmpty(organ_name)) return this.fail("参数不能为空");

        let model = await this.model("organ");
        let returnId;
        if (think.isEmpty(organ_id)) {
            returnId = await model.add({
                organ_name: organ_name
            });
        } else {
            returnId = await model.update({
                organ_name: organ_name
            }, {where: {organ_id: organ_id}});
        }
        return this.success({organ_id: returnId});
    }


    /**
     * 新增/修改待审核机构
     */
    async updatepreorganAction() {
        let organ = this.post();
        if (think.isEmpty(organ)) return this.fail("参数不能为空");

        let model = await this.model("pre_organ");
        let returnId;
        if (think.isEmpty(organ.organ_id)) {
            organ.statu = 0;
            returnId = await model.add(organ);
        } else {
            returnId = await model.update(organ, {where: {organ_id: organ.organ_id}});
        }
        return this.success({organ_id: returnId});
    }

    /**
     * 待审核机构审批
     */
    async auditpreorganAction() {
        let pre_organ = this.post();
        let organ_id = 0;
        pre_organ = think.extend(pre_organ, {audit_time: think.datetime()});
        if (think.isEmpty(pre_organ)) return this.fail("参数不能为空");

        //审批通过
        if (pre_organ.statu == 1) {
            organ_id = pre_organ.organ_id;
            delete pre_organ.organ_id;
            pre_organ.statu = 0;
            await this.model("pre_organ").delete({where: {organ_id: organ_id}});
            organ_id = await this.model("organ").add(pre_organ)
        } else {
            organ_id = pre_organ.organ_id;
            await this.model("pre_organ").update(pre_organ, {where: {organ_id: pre_organ.organ_id}});
        }
        return this.success({organ_id: organ_id});
    }

    /**
     * 设置机构状态(*)
     */
    async setorganAction() {
        let postdata = this.post();
        if (think.isEmpty(postdata)) return this.fail("参数不能为空");

        await this.model("organ").update(postdata, {where: {organ_id: postdata.organ_id}});
        return this.success();
    }

    //获取知识点树(*)
    async getknowledgeztreeAction() {
        let ptype_id = this.get("ptype_id");
        let choosedprop = this.get('choosedprop');
        let kbill_id = this.get('kbill_id');

        let sql = '';
        let where = '';
        //判断是否需要增加关联提取条件
        if (!think.isEmpty(choosedprop) && choosedprop != "{}") {
            choosedprop = JSON.parse(choosedprop);
            let kbill_ids = '';
            for (let item of choosedprop) {
                sql = "select DISTINCT pv.key_id from prop_value pv,property p" +
                    " where pv.ptype_id = p.ptype_id " +
                    " and pv.target_id = 4 " +
                    " and p.prop_id = " + item.prop_id +
                    " and p.path_id like CONCAT('%|',pv.prop_id,'%')";

                //将上一次查找到的key_id带入条件中
                if (kbill_ids.length > 0) {
                    sql += " and pv.key_id in (" + kbill_ids + ")";
                }

                data = await this.model("prop_value").query(sql);
                let tmp_ids = '';

                for (let item of data) {
                    if (tmp_ids.length > 0) tmp_ids += ",";
                    tmp_ids += item.key_id;
                }
                if (tmp_ids.length > 0) kbill_ids = tmp_ids
            }

            if (kbill_ids.length > 0) {
                where = where + " and kbill_id in (" + kbill_ids.split(',')[0] + ") ";
            } else {
                where = " and 1 = 0 "
            }
        }

        if (!think.isEmpty(kbill_id)) {
            where = where + " and kbill_id = " + kbill_id
        }

        sql = " select kid as id,parent_id as pId,value as name,path_name" +
            " from knowledge where 1 = 1 " + where +
            " order by parent_id,sort_no ";

        let data = await this.model('knowledge').query(sql);
        this.success(data);
    }

    //获取部门树
    async getdepartmenttreeAction() {
        let organ_id = this.get("organ_id") || 0;
        let sql = " select department_id as id,case when parent_id = 0 then '#' else parent_id end as parent,department_name as text from department where organ_id = " + organ_id;
        let data = await this.model('department').query(sql);
        this.success(data);
    }

    /**
     * 新增/修改知识点(*)
     */
    async updateknowledgeAction() {
        let parent_id = this.post("parent_id") || 0;
        let kid = this.post("kid");
        let value = this.post("value");
        let kbill_id = this.post("kbill_id");
        if (think.isEmpty(value)) return this.fail("value参数不能为空");
        if (think.isEmpty(kbill_id)) return this.fail("kbill_id参数不能为空");

        //获取当先的模型信息
        let model = await this.model("knowledge");
        let returnId;
        let path_id = '';
        let parent = await model.find({where: {kid: parent_id}});

        if (!think.isEmpty(parent)) {
            path_id = parent.path_id;
        }

        try {
            await model.startTrans();
            //新增
            if (think.isEmpty(kid)) {
                kid = await model.add({
                    kid: kid,
                    value: value,
                    parent_id: parent_id,
                    path_id: path_id,
                    depth: parent.depth + 1,
                    kbill_id: kbill_id
                });

                await model.update({
                    path_id: path_id + "|" + kid
                }, {where: {kid: kid}});
            }
            //修改 
            else {
                await model.update({
                    value: value
                }, {where: {kid: kid}});
            }

            //处理full_name
            let data = await model.find({where: {kid: kid}});
            let depth_data = await model.query("select distinct depth from knowledge where path_id like '" + data.path_id + "%' order by depth");

            for (let item of depth_data) {
                let exec_sql = "update knowledge a left join knowledge b on a.parent_id = b.kid " +
                    " set a.path_name = CONCAT(IFNULL(b.path_name,''),case when IFNULL(b.path_name,'') <> '' then '->' else '' end ,a.value)" +
                    " where a.path_id like '" + data.path_id + "%' and a.depth = " + item.depth;
                await model.execute(exec_sql);
            }

            await model.commit();
        } catch (e) {
            await model.rollback();
            return this.fail('服务端异常');
        }

        return this.success({kid: kid});
    }

    //新增/修改部门
    async updatedepartmentAction() {
        let parent_id = this.post("parent_id") || 0;
        let department_id = this.post("department_id");
        let department_name = this.post("department_name");
        let organ_id = this.post("organ_id");

        if (think.isEmpty(department_name)) return this.fail("参数不能为空");
        if (think.isEmpty(organ_id)) return this.fail("参数不能为空");

        //获取当先的模型信息
        let model = await this.model("department");
        let returnId;
        let path_id = '';
        let parent = await model.find({where: {parent_id: department_id}});

        if (!think.isEmpty(parent)) {
            path_id = parent.path_id;
        }

        try {
            await model.startTrans();
            //新增
            if (think.isEmpty(department_id)) {
                returnId = await model.add({
                    department_name: department_name,
                    parent_id: parent_id,
                    path_id: path_id,
                    depth: parent.depth + 1,
                    organ_id: organ_id
                });

                await model.update({
                    path_id: path_id + "|" + returnId
                }, {where: {department_id: returnId}});
            }
            //修改 
            else {
                returnId = await model.update({
                    department_name: department_name
                }, {where: {department_id: department_id}});
            }
            await model.commit();
        } catch (e) {
            await model.rollback();
            return this.fail('服务端异常');
        }

        return this.success({department_id: returnId});
    }

    //删除知识点
    async delknowledgeAction() {
        let kid = this.post("kid");
        if (think.isEmpty(kid)) return this.fail("参数不能为空");

        let model = await this.model("knowledge");

        //检查下级属性是否为空
        let count = await model.where({parent_id: kid}).count('kid');
        if (count > 0) {
            return this.fail('存在下级知识点内容，不能删除当前节点!');
        }

        let ret = await model.delete({where: {kid: kid}});
        return this.success(ret);
    }

    //删除部门
    async deldepartmentAction() {
        let department_id = this.post("department_id");
        if (think.isEmpty(department_id)) return this.fail("参数不能为空");

        let model = await this.model("department");

        //检查下级属性是否为空
        let count = await model.where({parent_id: department_id}).count('department_id');
        if (count > 0) {
            return this.fail('存在下级部门内容，不能删除当前节点!');
        }

        let ret = await model.delete({where: {department_id: department_id}});
        return this.success(ret);
    }

    //删除机构
    async delorganAction() {
        let organ_id = this.post("organ_id");
        if (think.isEmpty(organ_id)) return this.fail("参数不能为空");

        let model = await this.model("organ");

        let ret = await model.delete({where: {organ_id: organ_id}});
        return this.success(ret);
    }

    //删除待审核机构
    async delpreorganAction() {
        let organ_id = this.post("organ_id");
        if (think.isEmpty(organ_id)) return this.fail("参数不能为空");

        let model = await this.model("pre_organ");

        let ret = await model.delete({where: {organ_id: organ_id}});
        return this.success(ret);
    }

    //获取知识点选择器(*)
    async getknowledgeselectorAction() {
        let offset = this.get('offset') || 0;
        let limit = this.get('limit') || 999999;
        let search = this.get("search");
        let kbill_id = this.get('kbill_id');

        let where = " 1 = 1 ";

        if (!think.isEmpty(search)) {
            where = where + " and value like '%" + search + "%'";
        }

        if (!think.isEmpty(kbill_id)) {
            where = where + " and kbill_id = " + kbill_id;
        }

        let data = await this.model('knowledge')
            .field("kid as prop_id,value as prop_name,parent_id,path_name")
            .limit(offset, limit)
            .where(where)
            .countSelect();

        let json = {
            total: data.count,
            rows: data.data
        };

        this.success(json);
    }

    //获取知识点选择器(*)
    async getknowledgeinfoAction() {
        let offset = this.get('offset') || 0;
        let limit = this.get('limit') || 999999;
        let kbill_id = this.get('kbill_id');
        let paper_id = this.get('paper_id');

        let where = " not EXISTS( select 1 from knowledge p where k.kid = p.parent_id) ";

        if (!think.isEmpty(kbill_id)) {
            where = where + " and k.kbill_id = " + kbill_id;
        }

        if(!think.isEmpty(paper_id)){
            where = where + " and exists (select 1 from quest_knowledge q,paper_quest p " +
                                "where p.quest_id = q.quest_id and q.kid = k.kid and p.paper_id = " + paper_id + ")";
        }

        let data = await this.model('knowledge')
            .alias('k')
            .join(' knowledge_bill b on k.kbill_id = b.kbill_id')
            .field("k.kbill_id,k.kid,k.value,k.parent_id,k.path_name,b.kbill_name,(select count(*) from quest_knowledge where kid = k.kid) as quest_num,0 as select_num,1 as count")
            .limit(offset, limit)
            .where(where)
            .countSelect();

        let json = {
            total: data.count,
            rows: data.data
        };

        this.success(json);
    }

    //提取关联内容(*)
    async getrelateAction() {
        let prop_type_ids = this.get("prop_type_ids");
        let sql;
        sql = "SELECT * from relate where 1 = 1 ";
        if (!think.isEmpty(prop_type_ids) && prop_type_ids != "[]") {
            sql += " and (";
            var count = 0;
            prop_type_ids = JSON.parse(prop_type_ids);
            for (let item of prop_type_ids) {
                if (count > 0) sql += " or ";
                count++;
                sql += " exists (SELECT 1 from relate_detail d where d.relate_id = relate.relate_id and ptype_id = " + item.ptype_id + ")";
            }
            sql += ")"
        }

        let data = await this.model('relate').query(sql);

        this.success(data);
    }

    //新增，修改属性关联(*)
    async updaterelateAction() {
        let relate_id = this.post("relate_id");
        let target_ids = this.post("target_ids");
        let organ_id = this.post("organ_id");
        let relate_name = this.post("relate_name");
        let target_remark = this.post('target_remark');

        if (think.isEmpty(relate_name)) return this.fail("参数不能为空");
        if (think.isEmpty(target_ids)) return this.fail("类型参数不能为空");
        if (think.isEmpty(organ_id)) return this.fail("参数不能为空");

        let relate = {
            organ_id: organ_id,
            relate_name: relate_name,
            target_remark: target_remark
        };

        let tb_main = 'relate';

        //写入数据
        let model_main = await this.model(tb_main);
        let model_target = await this.model('relate_target');

        try {
            await model_main.startTrans();

            if (think.isEmpty(relate_id)) {
                relate_id = await model_main.add(relate); //新增 
            } else {
                await model_main.update(relate, {where: {relate_id: relate_id}}); //修改
            }


            let datas = [];
            if (!think.isEmpty(target_ids) && target_ids != "[]") {
                target_ids = JSON.parse(target_ids);
                for (let v of target_ids) {
                    datas.push({
                        relate_id: relate_id,
                        target_id: v.target_id
                    });
                }

                //添加答案
                await model_target.delete({where: {relate_id: relate_id}});
                await model_target.addMany(datas);
            }

            await model_main.commit();
        } catch (e) {
            await model_main.rollback();
            return this.fail("保存失败!");
        }

        return this.success({relate_id: relate_id});
    }

    //新增，修改属性关联(*)
    async updaterelatedetailAction() {
        let relate_id = this.post("relate_id");
        let ptype_id = this.post("ptype_id");
        let remark = this.post("remark");
        let ids = this.post("ids");
        let detail_id = this.post("detail_id");

        if (think.isEmpty(relate_id)) return this.fail("relate_id参数不能为空");
        if (think.isEmpty(ptype_id)) return this.fail("ptype_id参数不能为空");
        if (think.isEmpty(ids)) return this.fail("ids参数不能为空");

        let relate_detail = {
            relate_id: relate_id,
            ptype_id: ptype_id,
            remark: remark
        };

        let model_detail = await this.model('relate_detail');
        let model_child = await this.model('relate_detail_child').db(model_detail.db());

        try {
            await model_detail.startTrans();
            if (think.isEmpty(detail_id)) {
                detail_id = await model_detail.add(relate_detail);
            } else {
                await model_child.delete({where: {detail_id: detail_id}});
                await model_detail.update(relate_detail, {where: {detail_id: detail_id}}); //修改
            }

            let relate_detail_child = [];
            if (!think.isEmpty(ids)) {
                ids = JSON.parse(ids);
                for (let v of ids) {
                    relate_detail_child.push({
                        detail_id: detail_id,
                        relate_id: relate_id,
                        ptype_id: ptype_id,
                        prop_id: v.prop_id
                    });
                }

                await model_child.addMany(relate_detail_child);
            }

            await model_detail.commit();
        } catch (e) {
            await model_detail.rollback();
            return this.fail("保存失败!");
        }

        //更新关联属性备注
        await this.updaterelateremark(relate_id);

        return this.success({detail_id: detail_id});
    }

    //更新关联属性备注(*)
    async updaterelateremark(relate_id) {
        let sql = 'select p.ptype_name from relate_detail d,prop_type p' +
            ' where d.ptype_id = p.ptype_id' +
            ' and d.relate_id = ' + relate_id +
            ' order by p.sort_no';

        let data = await this.model('relate_detail').query(sql);
        let remark = '';
        for (let item of data) {
            if (remark.length > 0) remark += ',';
            remark += item.ptype_name;
        }

        await this.model('relate').update({remark: remark}, {where: {relate_id: relate_id}});
    }

    //删除属性关联
    async delrelateAction() {
        let relate_id = this.post("relate_id");

        if (think.isEmpty(relate_id)) return this.fail("参数不能为空");

        let model_main = await this.model('relate');
        let model_target = await this.model('relate_target').db(model_main.db());
        let model_detail = await this.model('relate_detail').db(model_main.db());
        let model_child = await this.model('relate_detail_child').db(model_main.db());

        try {
            await model_main.startTrans();

            await model_main.delete({where: {relate_id: relate_id}});
            await model_target.delete({where: {relate_id: relate_id}});
            await model_detail.delete({where: {relate_id: relate_id}});
            await model_child.delete({where: {relate_id: relate_id}});

            await model_main.commit();
        } catch (e) {
            await model_main.rollback();
            return this.fail("保存失败!");
        }

        return this.success();
    }

    //删除属性关联明细(*)
    async delrelatedetailAction() {
        let relate_id = this.post("relate_id");
        let detail_id = this.post("detail_id");

        if (think.isEmpty(relate_id)) return this.fail("参数不能为空");
        if (think.isEmpty(detail_id)) return this.fail("参数不能为空");

        let model_main = await this.model('relate_detail');
        let model_child = await this.model('relate_detail_child').db(model_main.db());

        try {
            await model_main.startTrans();

            await model_main.delete({where: {detail_id: detail_id}});
            await model_child.delete({where: {detail_id: detail_id}});

            await model_main.commit();
        } catch (e) {
            await model_main.rollback();
            return this.fail("保存失败!");
        }

        await this.updaterelateremark(relate_id);

        return this.success();
    }

    //获取属性关联明细
    async getrelatedetailAction() {
        let relate_id = this.get("relate_id");
        let date = await this.model('relate_detail').alias('r')
            .join('prop_type t on r.ptype_id = t.ptype_id')
            .field('r.*,case when r.ptype_id > 0 then t.ptype_name else "知识点" end as ptype_name ')
            .order(" detail_id ")
            .select({where: {relate_id: relate_id}});
        this.success(date);
    }

    //获取系统对象
    async getsystargetAction() {
        let is_apply = this.get('is_apply') || 0;
        let where = '';
        if (is_apply == 1) {
            where = ' IFNULL(apply_ptype_id,0) = 0 '
        }

        let date = await this.model('sys_target').order(" target_id ").where(where).select();
        this.success(date);
    }

    //获取知识点目录(*)
    async queryknowledgebillAction() {
        let organ_id = this.get('organ_id');
        if (think.isEmpty(organ_id)) return this.fail("organ_id参数不能为空");

        let offset = this.get('offset') || 0;
        let limit = this.get('limit') || 999999;
        let props = this.get('props');

        let where = ' 1 = 1 ';
        if (!think.isEmpty(props) && props != "{}") {
            props = JSON.parse(props);

            for (let item of props) {
                if (item.data_type == 0) {
                    where += " and exists(select 1 from prop_value where target_id = 4 and key_id =  q.kbill_id " +
                        " and ptype_id = " + item.ptype_id +
                        " and prop_id = " + item.prop_id + ") ";
                }

                if (item.data_type == 1) {
                    where += " and exists(select 1 from prop_value where target_id = 4 and key_id =  q.kbill_id " +
                        " and ptype_id = " + item.ptype_id +
                        " and num_value >= " + item.num_value1 +
                        " and num_value <= " + item.num_value2 + ") ";
                }
            }
        }
        let data = await this.model('knowledge_bill').alias('q')
            .join("sys_operator s ON q.opr_id=s.opr_id")
            .field("q.*,s.opr_name," +
                "(select count(*) from knowledge k where k.kbill_id = q.kbill_id) as knum," +
                "(select count(*) from quest_knowledge qk,knowledge k where qk.kid = k.kid and k.kbill_id = q.kbill_id) as quest_num")
            .limit(offset, limit)
            .where(where)
            .countSelect();

        let json = {
            total: data.count,
            rows: data.data
        };

        this.success(json);
    }

    //新增，修改知识点纲要(*)
    async updateknowledgebillAction() {
        let kbill_id = this.post("kbill_id");
        let organ_id = this.post("organ_id");
        let kbill_name = this.post("kbill_name");
        let opr_id = this.post("opr_id");
        let opr_times = this.post("opr_times") || 0;
        let opr_date = think.datetime();
        let props = this.post("props");

        if (think.isEmpty(organ_id)) return this.fail("organ_id参数不能为空");
        if (think.isEmpty(kbill_name)) return this.fail("kbill_name参数不能为空");
        if (think.isEmpty(opr_id)) return this.fail("opr_id参数不能为空");
        if (think.isEmpty(opr_times)) return this.fail("opr_times参数不能为空");

        //题目数据
        let data = {
            organ_id: organ_id,
            kbill_name: kbill_name,
            opr_id: opr_id,
            opr_date: opr_date,
            opr_times: opr_times
        };

        let model_knowledge_bill = await this.model('knowledge_bill');
        let model_prop_value = await this.model("prop_value").db(model_knowledge_bill.db());

        if (think.isEmpty(kbill_id)) {
            let count = await model_knowledge_bill.where({kbill_name: kbill_name}).count('kbill_id');
            if (count > 0) {
                return this.fail('对不起，该目录已经存在!');
            }
        }

        try {
            await model_knowledge_bill.startTrans();

            //删除相关表数据
            if (!think.isEmpty(kbill_id)) {
                await model_prop_value.delete({
                    where: {
                        target_id: 4,
                        key_id: kbill_id
                    }
                });
            }

            if (think.isEmpty(kbill_id)) {
                kbill_id = await model_knowledge_bill.add(data); //新增 
            } else {
                await model_knowledge_bill.update(data, {where: {kbill_id: kbill_id}}); //修改
            }

            //属性数据
            let prop_datas = [];

            if (!think.isEmpty(props)) {
                props = JSON.parse(props);
                for (let v of props) {
                    prop_datas.push(think.extend({key_id: kbill_id}, v));
                }

                //添加属性
                await model_prop_value.addMany(prop_datas);
            }

            await model_knowledge_bill.commit();
        } catch (e) {
            await model_knowledge_bill.rollback();
            return this.fail("保存失败!");
        }

        return this.success({kbill_id: kbill_id});
    }

    //获取指定对象属性(*)
    async gettargetpropvalueAction() {
        let target_id = this.get("target_id");
        let key_id = this.get("key_id");
        let prop_value_data = await this.model('prop_value')
            .alias('p')
            .join('property pt on p.prop_id = pt.prop_id')
            .field('p.ptype_id,p.prop_id,p.num_value,p.text_value,pt.prop_name,pt.path_name')
            .select({
                where: {
                    target_id: target_id,
                    key_id: key_id
                }
            });

        this.success(prop_value_data);
    }

    //删除知识点纲要(*)
    async delknowledgebillAction() {
        let kbill_id = this.post("kbill_id");
        if (think.isEmpty(kbill_id)) return this.fail("kbill_id参数不能为空");

        let count = await this.model('knowledge').where({kbill_id: kbill_id}).count('kid');
        if (count > 0) {
            return this.fail('该目录下已经存在知识点，不能删除!');
        }

        await this.model('knowledge_bill').delete({where: {kbill_id: kbill_id}});
        await this.model('prop_value').delete({where: {target_id: 4, key_id: kbill_id}});
        this.success();
    }

    //获取系统对象(*)
    async getsystargetztreeAction() {

        let sql = " select target_id as id,0 as pId,target_name as name from sys_target ";
        let data = await this.model('sys_target').query(sql);
        this.success(data);
    }


    //更新属性树序号
    async updateknowledgesortnoAction() {
        let sort_data = this.post('data');
        if (think.isEmpty(sort_data)) return this.fail('参数不能为空!');
        sort_data = JSON.parse(sort_data);
        let data = [];
        for (let v of sort_data) {
            let map = {};
            map['kid'] = v.kid;
            map.sort_no = v.sort_no;
            data.push(map)
        }
        let res = await this.model("knowledge").updateMany(data);
        this.success(data);
    }

}