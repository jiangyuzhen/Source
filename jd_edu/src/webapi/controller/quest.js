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

    //添加试卷题目列表
    async addpaperquestAction() {
        let paper_id = this.post("paper_id");
        let questlist = this.post('questlist');

        if (think.isEmpty(paper_id)) return this.fail("paper_id参数不能为空");

        if (!think.isEmpty(questlist) && questlist != '{}') {
            questlist = JSON.parse(questlist);
            for (let quest of questlist) {
                await this.model("paper_quest").delete({where: {paper_id: paper_id, quest_id: quest.quest_id}});
            }

            await this.model("paper_quest").addMany(questlist);
        }
        return this.success({paper_id: paper_id});
    }

    //删除试卷题目列表
    async delpaperquestAction() {
        let paper_id = this.post("paper_id");
        let quest_id = this.post('quest_id');

        if (think.isEmpty(paper_id)) return this.fail("paper_id参数不能为空");
        if (think.isEmpty(quest_id)) return this.fail("quest_id参数不能为空");

        await this.model("paper_quest").delete({where: {paper_id: paper_id, quest_id: quest_id}});

        return this.success();
    }

    //删除题目(*)
    async delquestAction() {
        let quest_id = this.post("quest_id");
        let is_pre = this.post('is_pre') || 1;
        let paper_id = this.post('paper_id');

        if (think.isEmpty(quest_id)) return this.fail("参数不能为空");

        let quest_table = 'pre_question';
        let answer_table = 'pre_quest_answer';
        let knowledge_table = 'pre_quest_knowledge';
        if (is_pre != 1) {
            quest_table = 'question';
            answer_table = 'quest_answer';
            knowledge_table = 'quest_knowledge';
        }
        await this.model(quest_table).delete({where: {quest_id: quest_id}});
        await this.model(answer_table).delete({where: {quest_id: quest_id}});
        await this.model(knowledge_table).delete({where: {quest_id: quest_id}});
        await this.model('prop_value').delete({
            where: {
                key_id: quest_id,
                target_id: 1
            }
        });

        if (!think.isEmpty(paper_id)) {
            await this.model('paper_quest').delete({where: {quest_id: quest_id, paper_id: paper_id}});
        }

        this.success();
    }

    //删除试卷(*)
    async delpaperAction() {
        let paper_id = this.post("paper_id");
        if (think.isEmpty(paper_id)) return this.fail("参数不能为空");

        //检查试卷是否存在已审核题目，如果存在，则禁止删除
        let count = await this.model("paper_quest")
            .alias('p')
            .join('question q on q.quest_id = p.quest_id')
            .where({paper_id: paper_id}).count('q.quest_id');

        if (count > 0) {
            return this.fail('该试卷下存在已经审核的题目，禁止删除!');
        }

        await this.model('paper').delete({where: {paper_id: paper_id}});
        await this.model('paper_quest').delete({where: {paper_id: paper_id}});
        await this.model('prop_value').delete({
            where: {
                key_id: paper_id,
                target_id: 2
            }
        });

        this.success();
    }


    //获取指定题目相关信息
    async getpropquestinfoAction() {
        let quest_id = this.get("quest_id");
        let is_pre = this.get('is_pre') || 1;
        let prop_value_data = await this.model('prop_value')
            .alias('p')
            .join('property pt on p.prop_id = pt.prop_id')
            .field('p.ptype_id,p.prop_id,p.num_value,p.text_value,pt.prop_name,pt.path_name')
            .select({
                where: {
                    target_id: 1,
                    key_id: quest_id
                }
            });

        let answer_table = 'pre_quest_answer';
        let quest_knowledge_table = 'pre_quest_knowledge';

        //判断如果是从已审核题目表中提取数据
        if (is_pre != 1) {
            answer_table = 'quest_answer';
            quest_knowledge_table = 'quest_knowledge';
        }
        let answer_data = await this.model(answer_table).select({
            where: {quest_id: quest_id}
        });

        let pre_quest_knowledge = await this.model(quest_knowledge_table)
            .alias('p')
            .join('knowledge k on p.kid = k.kid')
            .field('p.kid,k.value,k.path_name')
            .select({where: {quest_id: quest_id}});

        let ret = {
            prop_value: prop_value_data,
            answer: answer_data,
            pre_quest_knowledge: pre_quest_knowledge
        };

        this.success(ret);
    }

    //获取试卷属性(*)——删除
    async getpaperinfoAction() {
    }

    //获取试卷题目信息
    async getquestpaperinfoAction() {
        let quest_id = this.get('quest_id');
        if (think.isEmpty(quest_id)) return this.fail("题目数参数不能为空");

        let sql = " SELECT t.type_name, q.quest_id, q.question,0 as score,q.type_id,a.title,q.analysis,q.show_type,q.audit_status " +
            " FROM (select quest_id,question,type_id,analysis,show_type,'已审核' as audit_status from question" +
            "        union all" +
            "       select quest_id,question,type_id,analysis,show_type,'未审核' from pre_question) q " +
            " left JOIN quest_type t ON q.type_id = t.type_id" +
            " left JOIN archive a ON a.archive_id = q.type_id" +
            " where q.quest_id = " + quest_id;

        let data = await this.model('paper_quest').query(sql);
        this.success(data);
    }

    //获取待审核题目列表
    async getprequestAction() {
        let offset = this.get('offset');
        let limit = this.get('limit');
        let status = this.get('status');
        let props = this.get('props');

        let where = ' 1 = 1 ';
        if (!think.isEmpty(status)) {
            where += " and status = " + status;
        }

        think.log('props->');
        think.log(props);
        if (!think.isEmpty(props) && props != "{}") {
            props = JSON.parse(props);

            for (let item of props) {
                if (item.data_type == 0) {
                    where += " and exists(select 1 from prop_value where target_id = 1 and key_id =  q.quest_id " +
                        " and ptype_id = " + item.ptype_id +
                        " and prop_id = " + item.prop_id + ") ";
                }

                if (item.data_type == 1) {
                    where += " and exists(select 1 from prop_value where target_id = 1 and key_id =  q.quest_id " +
                        " and ptype_id = " + item.ptype_id +
                        " and num_value >= " + item.num_value1 +
                        " and num_value <= " + item.num_value2 + ") ";
                }
            }
        }

        let data = await this.model('pre_question').alias('q').join([
            "sys_operator s ON q.opr_id=s.opr_id",
            "quest_type t ON q.type_id=t.type_id",
            "archive a ON q.archive_id=a.archive_id"
        ]).field("q.*,s.opr_name,t.type_name,a.title").limit(offset, limit).where(where).countSelect();

        let json = {
            total: data.count,
            rows: data.data
        };

        this.success(json);
    }

    //获取试卷题目列表(*)
    async getpaperquestAction() {
        let paper_id = this.get('paper_id');
        if (think.isEmpty(paper_id)) return this.fail('参数不能为空!');

        let sql = " select qt.type_name,q.*,p.paper_id,p.score,p.sort_no,a.title,ifnull(p.is_import,0) as is_import " +
            " from paper_quest p, " +
            " (select 0 as is_pre,quest_id,statement,type_id,question,analysis,archive_id,show_type,opr_id,opr_date from question " +
            " union all " +
            " select 1 as is_pre,quest_id,statement,type_id,question,analysis,archive_id,show_type,opr_id,opr_date from pre_question) q " +
            " 	left outer join archive a on q.archive_id = a.archive_id " +
            " 	,quest_type qt " +
            " where p.quest_id = q.quest_id " +
            "  and q.type_id = qt.type_id " +
            "  and p.paper_id = " + paper_id +
            "  order by p.sort_no";
        let data = await this.model('paper_quest').query(sql);
        this.success(data);
    }

    //获取已审核题目列表
    async getquestAction() {
        let offset = this.get('offset');
        let limit = this.get('limit');
        let data = await this.model('question').alias('q').join([
            "sys_operator s ON q.opr_id=s.opr_id",
            "quest_type t ON q.type_id=t.type_id"
        ]).field("q.*,s.opr_name,t.type_name").limit(offset, limit).where({}).countSelect();

        let json = {
            total: data.count,
            rows: data.data
        };

        this.success(json);
    }

    //根据条件检索题目
    async queryquestAction() {
        let organ_id = this.get('organ_id');
        if (think.isEmpty(organ_id)) return this.fail("organ_id参数不能为空");

        let offset = this.get('offset');
        let limit = this.get('limit');
        let parm = this.get('parm');

        let where = ' 1 = 1 ';
        if (!think.isEmpty(parm) && parm != "{}") {
            parm = JSON.parse(parm);
            let quest_type_id = parm.quest_type_id;
            if (!think.isEmpty(quest_type_id)) {
                where += " and q.type_id = " + quest_type_id;
            }
            let quest_prop = parm.quest_prop;
            if (!think.isEmpty(quest_prop) && quest_prop != "{}") {
                quest_prop = JSON.parse(quest_prop);
                for (let item of quest_prop) {
                    if (item.data_type == 0) {
                        where += " and exists(select 1 from prop_value where target_id = 1 and key_id =  q.quest_id " +
                            " and ptype_id = " + item.ptype_id +
                            " and prop_id = " + item.prop_id + ") ";
                    }

                    if (item.data_type == 1) {
                        where += " and exists(select 1 from prop_value where target_id = 1 and key_id =  q.quest_id " +
                            " and ptype_id = " + item.ptype_id +
                            " and num_value >= " + item.num_value1 +
                            " and num_value <= " + item.num_value2 + ") ";
                    }
                }
            }
            let quest_knowledge = parm.quest_knowledge;
            if (!think.isEmpty(quest_knowledge) && quest_knowledge != "{}") {
                quest_knowledge = JSON.parse(quest_knowledge);
                for (let item of quest_knowledge) {
                    where += " and exists(select 1 from quest_knowledge k where k.quest_id =  q.quest_id " +
                        " and k.kid = " + item.kid + ") ";
                }
            }
        }
        think.log("where->" + where);
        let data = await this.model('question').alias('q').join([
            "sys_operator s ON q.opr_id=s.opr_id",
            "quest_type t ON q.type_id=t.type_id",
            "archive a on q.archive_id = a.archive_id"
        ]).field("q.*,s.opr_name,t.type_name,ifnull(a.title,'') as title ")
            .limit(offset, limit)
            .where(where)
            .countSelect();

        let json = {
            total: data.count,
            rows: data.data
        };

        this.success(json);
    }

    //获取题型
    async getquesttypeAction() {
        let data = await this.model('quest_type').select();
        this.success(data);
    }

    //新增，修改已审核题目/待审核题目
    async updatequestAction() {
        let quest_id = this.post("quest_id");
        let type_id = this.post("type_id");
        let organ_id = this.post("organ_id");
        let archive_id = this.post("archive_id");
        let statement = this.post("statement");
        let question = this.post("question");
        let answer_memo = this.post("answer_memo");
        let analysis = this.post("analysis");
        let show_type = this.post("show_type") || 1;

        let pre_quest_answer = this.post("pre_quest_answer");
        let prop_value = this.post("prop_value");
        let opr_id = this.post("opr_id");
        let quest_knowledge = this.post("quest_knowledge");
        let auditor_id = this.post('auditor_id') || '';
        let opr_date = this.post('opr_date') || think.datetime();
        let audit_date = this.post('audit_date') || think.datetime();

        let is_pre = this.post('is_pre') || 1;
        let paper_id = this.post('paper_id');
        let sys_opr_id = this.post('sys_opr_id');

        if (think.isEmpty(archive_id)) {
            if (think.isEmpty(statement)) return this.fail("题干参数不能为空");
        }

        if (think.isEmpty(type_id)) return this.fail("题目类型参数不能为空");
        if (think.isEmpty(organ_id)) return this.fail("机构参数不能为空");
        if (think.isEmpty(opr_id)) return this.fail("操作者参数不能为空");

        //题目数据
        let quest_data = {
            type_id: type_id,
            organ_id: organ_id,
            archive_id: archive_id,
            statement: statement,
            question: question,
            answer_memo: answer_memo,
            analysis: analysis,
            show_type: show_type,
            opr_id: opr_id,
            opr_date: opr_date,
            status: 0,
            auditor_id: auditor_id,
            audit_date: audit_date
        };

        let tb_question = 'pre_question';
        let tb_quest_answer = 'pre_quest_answer';
        let tb_quest_knowledge = 'pre_quest_knowledge';

        if (is_pre != 1) {
            tb_question = 'question';
            tb_quest_answer = 'quest_answer';
            tb_quest_knowledge = 'quest_knowledge';
        }
        //写入数据
        let model_question = await this.model(tb_question);
        let model_quest_answer = await this.model(tb_quest_answer).db(model_question.db());
        let model_quest_knowledge = await this.model(tb_quest_knowledge).db(model_question.db());
        let model_prop_value = await this.model("prop_value").db(model_question.db());
        let model_paper_quest = await this.model("paper_quest").db(model_question.db());
        let model_opr_input = await this.model("operator_target_input").db(model_question.db());

        let is_new = false;
        try {
            await model_question.startTrans();

            //先删除题目相关表数据
            if (!think.isEmpty(quest_id)) {
                await model_quest_answer.delete({where: {quest_id: quest_id}});
                await model_prop_value.delete({
                    where: {
                        target_id: 1,
                        key_id: quest_id
                    }
                });

                await model_quest_knowledge.delete({where: {quest_id: quest_id}});
            }

            if (think.isEmpty(quest_id)) {
                is_new = true;
                quest_id = await model_question.add(quest_data); //新增题目

                //如果有paper_id，还需写入试卷题目
                if (!think.isEmpty(paper_id)) {
                    let sort_no = 0;
                    let sql = " select ifnull(max(sort_no),0) + 1  as sort_no from paper_quest where paper_id = " + paper_id;
                    let tmp_data = await this.model('paper_quest').query(sql);

                    for (let i of tmp_data) {
                        sort_no = i.sort_no;
                    }

                    await model_paper_quest.delete({where: {paper_id: paper_id, quest_id: quest_id}});
                    await model_paper_quest.add({
                        paper_id: paper_id,
                        quest_id: quest_id,
                        score: 0,
                        sort_no: sort_no
                    });
                }
            } else {
                await model_question.update(quest_data, {where: {quest_id: quest_id}}); //修改题目
            }

            //答案数据
            let datas = [];
            if (!think.isEmpty(pre_quest_answer) && pre_quest_answer != "[]") {
                pre_quest_answer = JSON.parse(pre_quest_answer);
                for (let v of pre_quest_answer) {
                    datas.push({
                        quest_id: quest_id,
                        answer: v.answer,
                        current: v.current
                    });
                }

                //添加答案
                await model_quest_answer.addMany(datas);
            }

            //属性数据
            let prop_datas = [];
            let opr_input = [];
            if (!think.isEmpty(prop_value) && prop_value != "[]") {
                prop_value = JSON.parse(prop_value);
                for (let v of prop_value) {
                    if (is_new) {
                        opr_input.push({
                            opr_id: sys_opr_id,
                            target_id: 1,
                            ptype_id: v.ptype_id,
                            prop_id: v.prop_id,
                            text_value: v.text_value
                        });
                    }

                    prop_datas.push(think.extend({key_id: quest_id}, v));
                }

                //添加属性
                await model_prop_value.addMany(prop_datas);
            }

            //知识点
            let knowledage_datas = [];
            if (!think.isEmpty(quest_knowledge)) {
                quest_knowledge = JSON.parse(quest_knowledge);
                for (let v of quest_knowledge) {
                    if (is_new) {
                        opr_input.push({
                            opr_id: sys_opr_id,
                            target_id: 1,
                            ptype_id: "k",
                            prop_id: v.kid,
                            text_value: ''
                        });
                    }
                    knowledage_datas.push(think.extend({quest_id: quest_id}, v));
                }

                //添加属性
                await model_quest_knowledge.addMany(knowledage_datas);
            }


            //记录操作员最后一次选择的属性内容
            if (!think.isEmpty(sys_opr_id) && is_new) {
                await model_opr_input.delete({where: {opr_id: sys_opr_id, target_id: 1}});
                await model_opr_input.addMany(opr_input)
            }

            await model_question.commit();
        } catch (e) {
            think.log(e);
            await model_question.rollback();
            return this.fail("保存题目失败!");
        }

        //返回quest_id
        return this.success({quest_id: quest_id});
    }


    //题目审核不通过
    async auditquestnoAction() {
        let quest_id = this.post("quest_id");
        let remark = this.post("remark");
        let opr_id = this.post("opr_id");
        let audit_date = think.datetime();

        if (think.isEmpty(quest_id)) return this.fail("quest_id参数不能为空");
        if (think.isEmpty(remark)) return this.fail("remark参数不能为空");
        if (think.isEmpty(opr_id)) return this.fail("opr_id不能为空");

        //题目数据
        let quest_data = {
            remark: remark,
            auditor_id: opr_id,
            audit_date: audit_date,
            status: 100,
        };

        let model_question = await this.model('pre_question');

        try {
            await model_question.update(quest_data, {where: {quest_id: quest_id}}); //修改题目
        } catch (e) {
            return this.fail("保存题目失败!");
        }

        //返回quest_id
        return this.success({quest_id: quest_id});
    }


    //题目试卷不通过
    async auditpapernoAction() {
        let paper_id = this.post("paper_id");
        let remark = this.post("remark");
        let opr_id = this.post("opr_id");
        let audit_date = think.datetime();

        if (think.isEmpty(paper_id)) return this.fail("paper_id参数不能为空");
        if (think.isEmpty(remark)) return this.fail("remark参数不能为空");
        if (think.isEmpty(opr_id)) return this.fail("opr_id不能为空");

        //题目数据
        let data = {
            remark: remark,
            auditor_id: opr_id,
            audit_date: audit_date,
            status: 100,
        };

        let model = await this.model('paper');

        try {
            await model.update(data, {where: {paper_id: paper_id}}); //修改题目
        } catch (e) {
            return this.fail("保存失败!");
        }

        return this.success({paper_id: paper_id});
    }


    //新增，修改试卷
    async updatepaperAction() {
        let paper_id = this.post("paper_id");
        let organ_id = this.post("organ_id");
        let paper_name = this.post("paper_name");
        let quest_num = this.post("quest_num");
        let score = this.post("score");
        let duration = this.post("duration");
        let opr_id = this.post("opr_id");
        let opr_date = think.datetime();
        let is_pre = this.post("is_pre") || 1;

        let paper_prop = this.post("paper_prop");
        let is_audit = this.post("is_audit");
        let is_new = false;
        let status = 0;
        if (is_audit == 1) status = 1;
        if (think.isEmpty(paper_name)) return this.fail("参数不能为空");
        if (think.isEmpty(quest_num)) return this.fail("参数不能为空");
        if (think.isEmpty(organ_id)) return this.fail("参数不能为空");
        if (think.isEmpty(opr_id)) return this.fail("参数不能为空");
        if (think.isEmpty(is_audit)) return this.fail("is_audit参数不能为空");

        //题目数据
        let paper_data = {
            organ_id: organ_id,
            paper_name: paper_name,
            quest_num: quest_num,
            score: score,
            duration: duration,
            opr_id: opr_id,
            opr_date: opr_date,
            status: status
        };

        //写入数据
        let model_paper = await this.model('paper');
        let model_prop_value = await this.model("prop_value").db(model_paper.db());
        let model_opr_input = await this.model("operator_target_input").db(model_paper.db());

        try {
            await model_paper.startTrans();

            //删除相关表数据
            if (!think.isEmpty(paper_id)) {
                await model_prop_value.delete({
                    where: {
                        target_id: 2,
                        key_id: paper_id
                    }
                });
            }

            if (think.isEmpty(paper_id)) {
                is_new = true;
                paper_id = await model_paper.add(paper_data); //新增 
            } else {
                await model_paper.update(paper_data, {where: {paper_id: paper_id}}); //修改
            }

            //属性数据
            let prop_datas = [];
            let opr_input = [];
            if (!think.isEmpty(paper_prop)) {
                paper_prop = JSON.parse(paper_prop);
                for (let v of paper_prop) {
                    opr_input.push({
                        opr_id: opr_id,
                        target_id: 2,
                        ptype_id: v.ptype_id,
                        prop_id: v.prop_id
                    });

                    prop_datas.push(think.extend({key_id: paper_id}, v));
                }

                //添加属性
                await model_prop_value.addMany(prop_datas);
            }

            //记录操作员最后一次选择的属性内容
            if (is_new) {
                await model_opr_input.delete({where: {opr_id: opr_id, target_id: 2}});
                await model_opr_input.addMany(opr_input)
            }

            await model_paper.commit();
        } catch (e) {
            think.log(e);
            await model_paper.rollback();
            return this.fail("保存套题失败!");
        }

        return this.success({paper_id: paper_id});
    }

    //新增，修改审核题目
    async auditprequestAction() {
        let quest_id = this.post("quest_id");
        let type_id = this.post("type_id");
        let organ_id = this.post("organ_id");
        let archive_id = this.post("archive_id");
        let statement = this.post("statement");
        let question = this.post("question");
        let answer_memo = this.post("answer_memo");
        let analysis = this.post("analysis");
        let show_type = this.post("show_type") || 1;

        let quest_answer = this.post("pre_quest_answer");

        let prop_value = this.post("prop_value");
        let opr_id = this.post("opr_id");
        let opr_date = this.post("opr_date");
        let quest_knowledge = this.post("quest_knowledge");
        let auditor = this.post("auditor");

        if (think.isEmpty(quest_id)) return this.fail("quest_id参数不能为空");
        // if (think.isEmpty(statement)) return this.fail("statement参数不能为空");
        if (think.isEmpty(type_id)) return this.fail("type_id参数不能为空");
        if (think.isEmpty(organ_id)) return this.fail("organ_id参数不能为空");
        if (think.isEmpty(opr_id)) return this.fail("opr_id参数不能为空");

        //题目数据
        let quest_data = {
            quest_id: quest_id,
            type_id: type_id,
            organ_id: organ_id,
            archive_id: archive_id,
            statement: statement,
            question: question,
            answer_memo: answer_memo,
            analysis: analysis,
            show_type: show_type,
            opr_id: opr_id,
            opr_date: think.datetime(),
            auditor: auditor
        };

        //写入数据
        let model_question = await this.model("question");
        let model_quest_answer = await this.model("quest_answer").db(model_question.db());
        let model_prop_value = await this.model("prop_value").db(model_question.db());
        let model_quest_knowledge = await this.model("quest_knowledge").db(model_question.db());

        let model_pre_question = await this.model("pre_question").db(model_question.db());
        let model_pre_quest_answer = await this.model("pre_quest_answer").db(model_question.db());
        let model_pre_quest_knowledge = await this.model("pre_quest_knowledge").db(model_question.db());

        try {
            await model_question.startTrans();

            //先删除题目相关表数据
            if (!think.isEmpty(quest_id)) {
                await model_quest_answer.delete({where: {quest_id: quest_id}});
                await model_prop_value.delete({
                    where: {
                        target_id: 1,
                        key_id: quest_id
                    }
                });

                await model_quest_knowledge.delete({where: {quest_id: quest_id}});
            }

            await model_question.add(quest_data); //新增题目 

            //答案数据
            let datas = [];
            if (!think.isEmpty(quest_answer)) {
                quest_answer = JSON.parse(quest_answer);
                for (let v of quest_answer) {
                    datas.push({
                        quest_id: quest_id,
                        answer: v.answer,
                        current: v.current
                    })
                }

                //添加答案
                await model_quest_answer.addMany(datas);
            }

            //属性数据
            let prop_datas = [];
            if (!think.isEmpty(prop_value)) {
                prop_value = JSON.parse(prop_value);
                for (let v of prop_value) {
                    prop_datas.push(think.extend({key_id: quest_id}, v));
                }

                //添加属性
                await model_prop_value.addMany(prop_datas);
            }

            //知识点
            let knowledage_datas = [];
            if (!think.isEmpty(quest_knowledge)) {
                quest_knowledge = JSON.parse(quest_knowledge);
                for (let v of quest_knowledge) {
                    knowledage_datas.push(think.extend({quest_id: quest_id}, v));
                }

                //添加属性
                await model_quest_knowledge.addMany(knowledage_datas);
            }

            //删除待审核题目内容
            await model_pre_question.delete({where: {quest_id: quest_id}});
            await model_pre_quest_answer.delete({where: {quest_id: quest_id}});
            await model_pre_quest_knowledge.delete({where: {quest_id: quest_id}});

            await model_question.commit();
        } catch (e) {
            think.log(e);
            await model_question.rollback();
            return this.fail("添加题目失败!");
        }

        //返回quest_id
        return this.success({quest_id: quest_id});
    }

    //获取材料列表(*)
    async getarchiveAction() {
        let offset = this.get('offset') || 0;
        let limit = this.get('limit') || 1;
        think.log('limit->');
        think.log(limit);
        let archive_id = this.get('archive_id');
        let where = {};
        if (!think.isEmpty(archive_id)) {
            where = {archive_id: archive_id};
        }
        let data = await this.model('archive').alias("a").join("sys_operator o on a.opr_id = o.opr_id")
            .field("a.*,o.opr_name").limit(offset, limit).where(where).countSelect();

        let json = {
            total: data.count,
            rows: data.data
        };

        this.success(json);
    }

    //获试卷列表(*)
    async getpaperlistAction() {
        let offset = this.get('offset') || 0;
        let limit = this.get('limit') || 999999;
        let is_audit = this.get('is_audit');
        let querycondition = this.get('querycondition');
        let props = this.get('props');


        if (think.isEmpty(is_audit)) return this.fail('is_audit参数不能为空!');
        let where = " 1 = 1 ";
        if (is_audit == 1) {
            where = " ((status = 10 or status = 1) " +
                " and (select count(*) from paper_quest q,pre_question qe where q.paper_id = a.paper_id and qe.quest_id = q.quest_id) > 0 ) ";
        } else if (is_audit == 2) {
            where = " (status = 1 " +
                " and (select count(*) from paper_quest q,pre_question qe where q.paper_id = a.paper_id and qe.quest_id = q.quest_id) = 0 ) ";
        } else {
            where = " status <> 1";
            if (!think.isEmpty(querycondition)) {
                if (querycondition == 'sel=2') {
                    where = " status <> 10 and status <> 1 "
                }
                if (querycondition == 'sel=3') {
                    where = " status = 10 "
                }
            }
        }

        if (!think.isEmpty(props) && props != "{}") {
            props = JSON.parse(props);
            for (let item of props) {
                if (item.data_type == 0) {
                    where += " and exists(select 1 from prop_value where target_id = 2 and key_id =  a.paper_id " +
                        " and ptype_id = " + item.ptype_id +
                        " and prop_id = " + item.prop_id + ") ";
                }

                if (item.data_type == 1) {
                    where += " and exists(select 1 from prop_value where target_id = 2 and key_id =  a.paper_id " +
                        " and ptype_id = " + item.ptype_id +
                        " and num_value >= " + item.num_value1 +
                        " and num_value <= " + item.num_value2 + ") ";
                }
            }
        }

        let data = await this.model('paper')
            .alias("a")
            .join("sys_operator o on a.opr_id = o.opr_id")
            .field("a.*,o.opr_name,(select count(*) from paper_quest q where q.paper_id = a.paper_id) as quest_num," +
                "(select count(*) from paper_quest q,question qe where q.paper_id = a.paper_id and qe.quest_id = q.quest_id) as audit_num," +
                "(select count(*) from paper_quest q,pre_question qe where q.paper_id = a.paper_id and qe.quest_id = q.quest_id) as pre_audit_num," +
                "(select count(distinct k.kid) from paper_quest q,quest_knowledge k where q.quest_id = k.quest_id) as knum")
            .limit(offset, limit).where(where).countSelect();
        let json = {
            total: data.count,
            rows: data.data
        };

        this.success(json);
    }

    //保存材料(*)
    async updatearchiveAction() {
        let archive_id = this.post("archive_id");
        let title = this.post("title");
        let organ_id = this.post("organ_id") || 0;
        let content = this.post("content");
        let sort_type = this.post("sort_type") || 0;
        let opr_id = this.post("opr_id");


        if (think.isEmpty(title)) return this.fail("参数不能为空");
        if (think.isEmpty(content)) return this.fail("参数不能为空");
        if (think.isEmpty(opr_id)) return this.fail("参数不能为空");

        let opr_date = think.datetime();

        //数据
        let data = {
            title: title,
            organ_id: organ_id,
            content: content,
            opr_id: opr_id,
            opr_date: opr_date,
            delete: 0,
            sort_type: sort_type
        };

        //写入数据
        let model = await this.model("archive");

        try {
            if (think.isEmpty(archive_id)) {
                archive_id = await model.add(data); //新增 
            } else {
                await model.update(data, {where: {archive_id: archive_id}}); //修改
            }
        } catch (e) {
            think.log(e);
            return this.fail("保存数据失败!");
        }

        return this.success({archive_id: archive_id});
    }

    async deletearchiveAction() {
        let archive_id = this.post("archive_id");

        if (think.isEmpty(archive_id)) return this.fail("参数不能为空");

        let count = await this.model("pre_question").where({archive_id: archive_id}).count('quest_id');
        if (count > 0) {
            return this.fail('材料已经存在题目使用，禁止删除!');
        }

        count = await this.model("question").where({archive_id: archive_id}).count('quest_id');
        if (count > 0) {
            return this.fail('材料已经存在题目使用，禁止删除!');
        }

        let model = await this.model("archive");

        try {
            let ret = await this.model("archive").delete({where: {archive_id: archive_id}});
            return this.success(ret);
        } catch (e) {
            think.log(e);
            return this.fail("保存数据失败!");
        }
    }

    //获取材料选择内容
    async getarchiveselectorAction() {
        let offset = this.get('offset');
        let limit = this.get('limit');
        let search = this.get("search");

        let where = " 1 = 1 ";

        if (!think.isEmpty(search)) {
            where = where + " and title like '%" + search + "%'";
        }
        let data = await this.model('archive')
            .field("archive_id,title")
            .limit(offset, limit)
            .where(where)
            .countSelect();

        let json = {
            total: data.count,
            rows: data.data
        };

        this.success(json);
    }

    //更新属性树序号(*)
    async updatepaperquestsortnoAction() {
        let paper_id = this.post('paper_id');
        let paper_quest = this.post('paper_quest');

        if (think.isEmpty(paper_id)) return this.fail('paper_id参数不能为空!');
        if (think.isEmpty(paper_quest)) return this.fail('参数不能为空!');

        paper_quest = JSON.parse(paper_quest);

        for (let v of paper_quest) {
            await this.model("paper_quest").update({sort_no: v.sort_no}, {
                where: {
                    paper_id: paper_id,
                    quest_id: v.quest_id
                }
            });
        }

        this.success();
    }

    //设置未审核题目状态(*)
    async setprequeststatusAction() {
        let quest_id = this.post("quest_id");
        let status = this.post('status');

        if (think.isEmpty(quest_id)) return this.fail("quest_id参数不能为空");
        if (think.isEmpty(status)) return this.fail("status参数不能为空");

        await this.model('pre_question').update({status: status}, {where: {quest_id: quest_id}});
        this.success();
    }

    //设置试卷状态(*)
    async setpaperstatusAction() {
        let paper_id = this.post("paper_id");
        let status = this.post('status');

        if (think.isEmpty(paper_id)) return this.fail("paper_id参数不能为空");
        if (think.isEmpty(status)) return this.fail("status参数不能为空");

        await this.model('paper').update({status: status}, {where: {paper_id: paper_id}});

        let exec_sql = "update pre_question q join paper_quest p on p.quest_id = q.quest_id set q.status = " + status + " where p.paper_id = " + paper_id;
        await this.model('pre_question').execute(exec_sql);

        this.success();
    }

    //获取试卷题目列表(*)
    async getarchivequestAction() {
        let archive_id = this.get('archive_id');
        if (think.isEmpty(archive_id)) return this.fail('archive_id参数不能为空!');

        let sql = " select q.*,t.type_name " +
            " from (select quest_id,statement,type_id,question,analysis,show_type,opr_id,opr_date,archive_sort_no from question where archive_id = " + archive_id +
            " union all " +
            " select quest_id,statement,type_id,question,analysis,show_type,opr_id,opr_date,archive_sort_no from pre_question where archive_id = " + archive_id + ") q" +
            " left join quest_type t on q.type_id = t.type_id" +
            "  order by q.archive_sort_no";
        let data = await this.model('pre_question').query(sql);
        this.success(data);
    }

    //更新材料题序号(*)
    async updatearchivequestsortnoAction() {
        let archive_id = this.post('archive_id');
        let quests = this.post('quests');

        if (think.isEmpty(archive_id)) return this.fail('archive_id参数不能为空!');
        if (think.isEmpty(quests)) return this.fail('quests参数不能为空!');

        think.log('quests->');
        think.log(quests);
        quests = JSON.parse(quests);

        for (let v of quests) {
            await this.model("pre_question").update({archive_sort_no: v.sort_no}, {where: {quest_id: v.quest_id}});
            await this.model("question").update({archive_sort_no: v.sort_no}, {where: {quest_id: v.quest_id}});
        }

        this.success();
    }
}