var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('./admin/index');
});

router.get('/index_main', function(req, res, next) {
    res.render('./admin/index_main', { title: '测试模版' });
});

router.get('/login', function(req, res, next) {
    res.render('./admin/login', { title: '云学时代教育平台 - 登录' });
});

router.get('/prop_type', function(req, res, next) {
    res.render('./admin/prop_type', { title: '属性类别' });
});

router.get('/prop_type_target', function(req, res, next) {
    res.render('./admin/prop_type_target', { title: '属性对象' });
});

router.get('/property', function(req, res, next) {
    res.render('./admin/property', { title: '属性维护' });
});

router.get('/pre_quest_input', function(req, res, next) {
    res.render('./admin/pre_quest_input', { title: '题目录入' });
});

router.get('/pre_quest_edit', function(req, res, next) {
    res.render('./admin/pre_quest_edit', { title: '题目编辑' });
});

router.get('/property_selector', function(req, res, next) {
    res.render('./admin/property_selector', { title: '属性选择' });
});

router.get('/answer_edit', function(req, res, next) {
    res.render('./admin/answer_edit', { title: '答案编辑' });
});

router.get('/organ', function(req, res, next) {
    res.render('./admin/organ', { title: '机构管理' });
});

router.get('/knowledge', function(req, res, next) {
    res.render('./admin/knowledge', { title: '知识点维护' });
});

router.get('/pre_quest_audit', function(req, res, next) {
    res.render('./admin/pre_quest_audit', { title: '单题审核' });
});

router.get('/paper_audit', function(req, res, next) {
    res.render('./admin/paper_audit', { title: '套题审核' });
});

router.get('/question_mng', function(req, res, next) {
    res.render('./admin/question_mng', { title: '题目管理' });
});

router.get('/pre_quest_archive_input', function(req, res, next) {
    res.render('./admin/pre_quest_archive_input', { title: '材料题录入' });
});

router.get('/archive_edit', function(req, res, next) {
    res.render('./admin/archive_edit', { title: '材料管理' });
});

router.get('/archive_selector', function(req, res, next) {
    res.render('./admin/archive_selector', { title: '材料选择' });
});

router.get('/department', function(req, res, next) {
    res.render('./admin/department', { title: '部门档案' });
});

router.get('/paper_input', function(req, res, next) {
    res.render('./admin/paper_input', { title: '套题录入' });
});

router.get('/paper_edit', function(req, res, next) {
    res.render('./admin/paper_edit', { title: '套题编辑' });
});

router.get('/quest_info', function(req, res, next) {
    res.render('./admin/quest_info', { title: '题目信息' });
});

router.get('/prop_relate', function(req, res, next) {
    res.render('./admin/prop_relate', { title: '属性关联' });
});

router.get('/prop_type_selector', function(req, res, next) {
    res.render('./admin/prop_type_selector', { title: '属性类别选择' });
});

router.get('/sys_role', function(req, res, next) {
    res.render('./admin/sys_role', { title: '角色管理' });
});

router.get('/sys_operator', function(req, res, next) {
    res.render('./admin/sys_operator', { title: '用户管理' });
});

router.get('/pre_organ', function(req, res, next) {
    res.render('./admin/pre_organ', { title: '机构申请' });
});

router.get('/pre_organ_audit', function(req, res, next) {
    res.render('./admin/pre_organ_audit', { title: '机构审批' });
});

router.get('/member', function(req, res, next) {
    res.render('./admin/member', { title: '学生列表' });
});

router.get('/paper_quest_input', function(req, res, next) {
    res.render('./admin/paper_quest_input', { title: '试卷题目编辑' });
});

router.get('/public_selector', function(req, res, next) {
    res.render('./admin/public_selector', { title: '选择器' });
});

router.get('/relate_property_selector', function(req, res, next) {
    res.render('./admin/relate_property_selector', { title: '属性选择' });
});

router.get('/paper_quest_add', function(req, res, next) {
    res.render('./admin/paper_quest_add', { title: '引入题目' });
});

router.get('/knowledge_bill_input', function(req, res, next) {
    res.render('./admin/knowledge_bill_input', { title: '知识点维护' });
});

router.get('/paper_quest_audit', function(req, res, next) {
    res.render('./admin/paper_quest_audit', { title: '套题审核' });
});

router.get('/quest_show', function(req, res, next) {
    res.render('./admin/quest_show', { title: '题目信息' });
});

router.get('/paper_mng', function(req, res, next) {
    res.render('./admin/paper_mng', { title: '套题维护' });
});

router.get('/sys_target_selector', function(req, res, next) {
    res.render('./admin/sys_target_selector', { title: '对象选择' });
});

router.get('/prop_apply', function(req, res, next) {
    res.render('./admin/prop_apply_input', { title: '应用目录管理' });
});

router.get('/bill_property', function(req, res, next) {
    res.render('./admin/bill_property', { title: '应用目录内容' });
});

router.get('/prop_type_apply', function(req, res, next) {
    res.render('./admin/prop_type_apply', { title: '应用目录列表' });
});

router.get('/prop_apply_target', function(req, res, next) {
    res.render('./admin/prop_apply_target', { title: '应用目录关联对象' });
});

router.get('/rule_input', function(req, res) {
    res.render('./admin/rule_input', { title: '组卷规则' });
});

router.get('/public_prop_query', function(req, res, next) {
    res.render('./admin/public_prop_query', { title: '属性检索',query_target_id: req.query.target_id});
});

router.get('/uploadfile', function(req, res, next) {
    res.render('./admin/uploadfile',{floderName:req.query.floderName});
});

router.get('/live_broadcast_schedule', function(req, res, next) {
    res.render('./admin/live_broadcast_schedule', { title: '直播预告'});
});

router.get('/live_broadcast_schedule_edit', function(req, res, next) {
    res.render('./admin/live_broadcast_schedule_edit', { title: '直播预告编辑'});
});



// 教师端新加入页面
router.get('/test_group_manage', function(req, res) {
    res.render('./admin/teacher/test_group_manage', { title: '测试分组管理'});
});

router.get('/dispose_work', function(req, res) {
    res.render('./admin/teacher/dispose_works', { title: '布置测试'});
});

router.get('/test_lists', function(req, res) {
    res.render('./admin/teacher/test_lists', { title: '测试列表'});
});

router.get('/test_result', function(req, res) {
    res.render('./admin/teacher/test_result', { title: '测试结果'});
});



module.exports = router;
