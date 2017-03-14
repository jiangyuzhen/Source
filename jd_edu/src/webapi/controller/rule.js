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

    //获组卷规则列表(*)
    async getrulelistAction() {
        let offset = this.get('offset');
        let limit = this.get('limit');

        let data = await this.model('rule')
            .alias("a")
            .join("sys_operator o on a.opr_id = o.opr_id")
            .field("a.*,o.opr_name")
            .limit(offset, limit).countSelect();

        let json = {
            total: data.count,
            rows: data.data
        };

        this.success(json);
    }

    //获取组卷规则信息
    async getruleinfoAction() {
        let rule_id = this.get('rule_id');
        if (think.isEmpty(rule_id)) return this.fail("rule_id参数不能为空");

        let data = await this.model('rule')
            .field("*")
            .where({rule_id: rule_id}).select();

        //提取规则知识点
        let kdata = await this.model('knowledge')
            .alias('k')
            .join(' knowledge_bill b on k.kbill_id = b.kbill_id')
            .join(' inner join rule_knowledge r on k.kid = r.kid')
            .field("k.kbill_id,k.kid,k.value,k.parent_id,k.path_name,b.kbill_name,(select count(*) from quest_knowledge where kid = k.kid) as quest_num,0 as select_num,r.count as count")
            .where(" r.rule_id = " + rule_id )
            .select();

        //提取规则属性
        let pdata = await this.model('prop_value')
            .alias('v')
            .join([
                "property p on p.prop_id = v.prop_id",
                "prop_type t ON v.ptype_id=t.ptype_id"
            ])
            .field(" p.prop_id,p.prop_name,t.data_type,t.ptype_id")
            .where({target_id: 5, key_id: rule_id})
            .select();

        //提取规则分组
        let gdata = await this.model('rule_group')
            .alias('r')
            .join('property p on p.prop_id = r.require_id')
            .field("r.*,p.prop_name as require_name")
            .order("r.group_id ASC")
            .where({rule_id: rule_id})
            .select();

        let gkdata = [];
        //提取分组知识点
        for (let group of gdata) {
            let group_id = group.group_id
            //提取规则分组
            gkdata = await this.model('rule_group_knowledge')
                .alias('g')
                .join([
                    ' knowledge k on k.kid = g.kid',
                    ' knowledge_bill b on k.kbill_id = b.kbill_id'
                ])
                .field("k.kbill_id,k.kid,k.value,k.parent_id,k.path_name,b.kbill_name," +
                    "(select count(*) from quest_knowledge where kid = k.kid) as quest_num," +
                    "g.quest_num as select_num,g.count as count")
                .where(" g.group_id = " + group_id)
                .select();
            group.knowledge = gkdata;
        }

        let json = data[0];
        json.ruleKnowledge = kdata;
        json.ruleGroup = gdata;
        json.prop_value = pdata;
        this.success(json);
    }

    //检查规则名称是否可用(*)
    async checkrulenameAction() {
        let rule_id = this.get('rule_id');
        let rule_name = this.get('rule_name');

        if (think.isEmpty(rule_name)) return this.fail("rule_name参数不能为空");

        //检查试卷是否存在已审核题目，如果存在，则禁止删除
        let count = await this.model("rule").where("rule_name = '" + rule_name + "' and rule_id <> " + rule_id).count('rule_id');

        if (count > 0) {
            return this.success('已存在名称相同的规则!');
        }
        return this.success('恭喜，目前还没有改名称的组卷规则!');
    }

    //删除组卷规则(*)
    async delruleAction() {
        let rule_id = this.post("rule_id");
        if (think.isEmpty(rule_id)) return this.fail("rule_id参数不能为空");

        await this.model('rule').delete({where: {rule_id: rule_id}});
        await this.model('rule_knowledge').delete({where: {rule_id: rule_id}});
        await this.model('rule_group').delete({where: {rule_id: rule_id}});
        await this.model('rule_group_knowledge').delete({where: {rule_id: rule_id}});
        await this.model('prop_value').delete({where: {target_id: 5, key_id: rule_id}});

        return this.success();
    }

    //添加组卷规则(*)
    async updateruleAction() {
        let rule_id = this.post("rule_id");
        let rule_name = this.post('rule_name');
        let quest_num = this.post('quest_num');
        let score = this.post('score');
        let duration = this.post('duration');
        let remark = this.post('remark');
        let opr_id = this.post("opr_id");
        let rule_knowledge = this.post('rule_knowledge');       //组卷规则考纲知识点表
        let rule_group = this.post('rule_group');               //组卷规则分组表
        let rule_prop = this.post('rule_prop');

        if (think.isEmpty(rule_name)) return this.fail("rule_name参数不能为空");
        if (think.isEmpty(opr_id)) return this.fail("opr_id参数不能为空");
        if (think.isEmpty(rule_knowledge)) return this.fail("rule_knowledge参数不能为空");
        if (think.isEmpty(rule_group)) return this.fail("rule_group参数不能为空");

        //组织保存数据
        let rule_data = {
            rule_name: rule_name,
            quest_num: quest_num,
            score: score,
            duration: duration,
            remark: remark,
            opr_id: opr_id,
            opr_date: think.datetime()
        };

        let model_rule = await this.model('rule');
        let model_rule_knowledge = await this.model('rule_knowledge').db(model_rule.db());
        let model_prop_value = await this.model('prop_value').db(model_rule.db());
        let model_rule_group = await this.model('rule_group').db(model_rule.db());
        let model_rule_group_knowldege = await this.model("rule_group_knowledge").db(model_rule.db());

        try {
            await model_rule.startTrans();

            if (think.isEmpty(rule_id) || rule_id == 0) {
                rule_id = await model_rule.add(rule_data); //新增
            } else {
                await model_rule.update(rule_data, {where: {rule_id: rule_id}}); //修改
            }

            //组卷规则知识点数据
            await model_rule_knowledge.delete({where: {rule_id: rule_id}});
            let datas = [];
            if (!think.isEmpty(rule_knowledge) && rule_knowledge != "[]") {
                rule_knowledge = JSON.parse(rule_knowledge);
                for (let v of rule_knowledge) {
                    datas.push({
                        rule_id: rule_id,
                        kid: v.kid,
                        count:v.count
                    });
                }
                await model_rule_knowledge.addMany(datas);
            }

            //组卷规则属性数据
            await model_prop_value.delete({where: {target_id: 5, key_id: rule_id}});
            datas = [];
            if (!think.isEmpty(rule_prop) && rule_prop != "[]") {
                rule_prop = JSON.parse(rule_prop);
                for (let v of rule_prop) {
                    datas.push({
                        target_id: 5,
                        ptype_id: v.ptype_id,
                        key_id: rule_id,
                        prop_id: v.prop_id,
                        num_value: v.num_value,
                        text_value: v.text_value
                    });
                }
                await model_prop_value.addMany(datas);
            }

            //组卷规则分组
            await model_rule_group.delete({where: {rule_id: rule_id}});
            await model_rule_group_knowldege.delete({where: {rule_id: rule_id}});

            if (!think.isEmpty(rule_group) && rule_group != "[]") {
                rule_group = JSON.parse(rule_group);
                for (let group of rule_group) {
                    let group_data = {
                        rule_id: rule_id,
                        type_id: group.type_id,
                        quest_num: group.quest_num,
                        score: group.score,
                        duration: group.duration,
                        require_id: group.require_id
                    };

                    datas = [];
                    //写组卷规则
                    let group_id = await model_rule_group.add(group_data);
                    let rule_group_knowledge = group.knowledge;
                    for (let k of rule_group_knowledge) {
                        datas.push({
                            rule_id: rule_id,
                            group_id: group_id,
                            kid: k.kid,
                            quest_num: k.select_num,
                            count:k.count
                        });
                    }

                    //添加组卷规则知识点列表
                    await model_rule_group_knowldege.addMany(datas);
                }
            }
            think.log('3');

            await model_rule.commit();
            return this.success({rule_id: rule_id});
        } catch (e) {
            think.log(e);
            await model_rule.rollback();
            return this.fail("保存失败!");
        }
    }
}