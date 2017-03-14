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

    //添加组卷规则(*)
    async addroomAction() {
        let room_no = this.post("room_no");
        let room_name = this.post('room_name');
        let teacher = this.post('teacher');

        if (think.isEmpty(room_no)) return this.fail("room_no参数不能为空");
        if (think.isEmpty(room_name)) return this.fail("room_name参数不能为空");
        if (think.isEmpty(teacher)) return this.fail("teacher参数不能为空");

        //组织保存数据
        let data = {
            room_no: room_no,
            room_name: room_name,
            teacher: teacher,
            created_time: think.datetime()
        };

        let model_room = await this.model('live_broadcast_room');

        try {
            await model_room.add(data); //新增
            return this.success({room_no: room_no});
        } catch (e) {
            think.log(e);
            return this.fail("保存失败!");
        }
    }

    //获取课件目录
    async getteacherdocAction() {
        let opr_id = this.post('opr_id');
        if (think.isEmpty(opr_id)) return this.fail("opr_id参数不能为空");

        let data = await this.model('teacher_doc')
            .field("*")
            .where({opr_id: opr_id}).select();

        this.success(data);
    }

    //添加修改课件目录
    async updateteacherdocAction() {
        let doc_id = this.post("doc_id");
        let doc_name = this.post('doc_name');
        let opr_id = this.post("opr_id");

        if (think.isEmpty(doc_name)) return this.fail("doc_name参数不能为空");
        if (think.isEmpty(opr_id)) return this.fail("opr_id参数不能为空");

        //组织保存数据
        let data = {
            doc_name: doc_name,
            opr_id: opr_id
        };

        let model = await this.model('teacher_doc');

        try {
            if (think.isEmpty(doc_id) || doc_id == 0) {
                doc_id = await model.add(data); //新增
            } else {
                await model.update(data, {where: {doc_id: doc_id}}); //修改
            }
            return this.success([{doc_id: doc_id,doc_name:doc_name}]);
        } catch (e) {
            think.log(e);
            return this.fail("保存失败!");
        }
    }

    //删除课件目录
    async delteacherdocAction() {
        let doc_id = this.post("doc_id");
        if (think.isEmpty(doc_id)) return this.fail("doc_id参数不能为空");

        await this.model('teacher_doc').delete({where: {doc_id: doc_id}});
        await this.model('teacher_pic').delete({where: {doc_id: doc_id}});

        return this.success();
    }

    //添加修改课件图片
    async updateteacherpicAction() {
        let doc_id = this.post("doc_id");
        let pic_url = this.post('pic_url');

        if (think.isEmpty(doc_id)) return this.fail("doc_id参数不能为空");
        if (think.isEmpty(pic_url)) return this.fail("pic_url参数不能为空");

        //组织保存数据
        let data = {
            doc_id: doc_id,
            pic_url: pic_url
        };
        let model = await this.model('teacher_pic');

        try {
            let pic_id = await model.add(data); //新增

            return this.success([{pic_id: pic_id,pic_url:pic_url}]);
        } catch (e) {
            think.log(e);
            return this.fail("保存失败!");
        }
    }

    //获取课件目录图片
    async getteacherpicAction() {
        let doc_id = this.post('doc_id');
        if (think.isEmpty(doc_id)) return this.fail("doc_id参数不能为空");

        let data = await this.model('teacher_pic')
            .field("*")
            .where({doc_id: doc_id}).select();

        this.success(data);
    }

    //删除课件图片
    async delteacherpicAction() {
        let pic_id = this.post("pic_id");
        if (think.isEmpty(pic_id)) return this.fail("pic_id参数不能为空");

        await this.model('teacher_pic').delete({where: {pic_id: pic_id}});
        return this.success();
    }

    //获取直播预告
    async getlivebroadcastscheduleAction() {
        let opr_id = this.get('opr_id');
        if (think.isEmpty(opr_id)) return this.fail("opr_id参数不能为空");

        let data = await this.model('live_broadcast_schedule')
            .field("*")
            .where({opr_id: opr_id}).select();

        this.success(data);
    }

    //删除直播预告
    async dellivebroadcastscheduleAction() {
        let scheduled_id = this.post("scheduled_id");
        if (think.isEmpty(scheduled_id)) return this.fail("scheduled_id参数不能为空");

        await this.model('live_broadcast_schedule').delete({where: {scheduled_id: scheduled_id}});
        return this.success();
    }

    //添加修改直播预告
    async updatelivebroadcastscheduleAction() {
        let scheduled_id = this.post("scheduled_id");
        let subject = this.post('subject');
        let description = this.post('description');
        let opr_id = this.post("opr_id");
        let scheduled_time = this.post('scheduled_time') || think.datetime();

        if (think.isEmpty(subject)) return this.fail("subject参数不能为空");
        if (think.isEmpty(opr_id)) return this.fail("opr_id参数不能为空");

        //组织保存数据
        let data = {
            subject: subject,
            description:description,
            scheduled_time:scheduled_time,
            opr_id: opr_id
        };

        let model = await this.model('live_broadcast_schedule');

        try {
            if (think.isEmpty(scheduled_id) || scheduled_id == 0) {
                scheduled_id = await model.add(data); //新增
            } else {
                await model.update(data, {where: {scheduled_id: scheduled_id}}); //修改
            }
            return this.success({scheduled_id: scheduled_id});
        } catch (e) {
            think.log(e);
            return this.fail("保存失败!");
        }
    }
}