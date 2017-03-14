'use strict';

import Base from './base.js';

var Diff_Timeout = 1;
var Diff_EditCost = 4;
var Match_Threshold = 0.5;
var Match_Distance = 1E3;
var Patch_DeleteThreshold = 0.5
var Patch_Margin = 4;
var Match_MaxBits = 32

function diff_commonPrefix(a, b) {
    if (!a || !b || a.charAt(0) != b.charAt(0)) return 0;
    for (var c = 0, d = Math.min(a.length, b.length), e = d, f = 0; c < e;) a.substring(f, e) == b.substring(f, e) ? f = c = e : d = e, e = Math.floor((d - c) / 2 + c);
    return e
};

function diff_halfMatch_(a, b) {
    function c(a, b, c) {
        for (var d = a.substring(c, c + Math.floor(a.length / 4)), e = -1, g = "", h, j, n, l; -1 != (e = b.indexOf(d, e + 1));) {
            var m = diff_commonPrefix(a.substring(c), b.substring(e)),
                s = diff_commonSuffix(a.substring(0, c), b.substring(0, e));
            g.length < s + m && (g = b.substring(e - s, e) + b.substring(e, e + m), h = a.substring(0, c - s), j = a.substring(c + m), n = b.substring(0, e - s), l = b.substring(e + m))
        }
        return 2 * g.length >= a.length ? [h, j, n, l, g] : null
    }

    if (0 >= Diff_Timeout) return null;
    var d = a.length > b.length ? a : b,
        e = a.length > b.length ? b : a;
    if (4 > d.length || 2 * e.length < d.length) return null;
    var f = this,
        g = c(d, e, Math.ceil(d.length / 4)),
        d = c(d, e, Math.ceil(d.length / 2)),
        h;
    if (!g && !d) return null;
    h = d ? g ? g[4].length > d[4].length ? g : d : d : g;
    var j;
    a.length > b.length ? (g = h[0], d = h[1], e = h[2], j = h[3]) : (e = h[0], j = h[1], g = h[2], d = h[3]);
    h = h[4];
    return [g, d, e, j, h]
};

function diff_cleanupMerge(a) {
    a.push([0, ""]);
    for (var b = 0, c = 0, d = 0, e = "", f = "", g; b < a.length;) switch (a[b][0]) {
        case 1:
            d++;
            f += a[b][1];
            b++;
            break;
        case -1:
            c++;
            e += a[b][1];
            b++;
            break;
        case 0:
            1 < c + d ? (0 !== c && 0 !== d && (g = diff_commonPrefix(f, e), 0 !== g && (0 < b - c - d && 0 == a[b - c - d - 1][0] ? a[b - c - d - 1][1] += f.substring(0, g) : (a.splice(0, 0, [0, f.substring(0, g)]), b++), f = f.substring(g), e = e.substring(g)), g = diff_commonSuffix(f, e), 0 !== g && (a[b][1] = f.substring(f.length - g) + a[b][1], f = f.substring(0, f.length -
                g), e = e.substring(0, e.length - g))), 0 === c ? a.splice(b - d, c + d, [1, f]) : 0 === d ? a.splice(b - c, c + d, [-1, e]) : a.splice(b - c - d, c + d, [-1, e], [1, f]), b = b - c - d + (c ? 1 : 0) + (d ? 1 : 0) + 1) : 0 !== b && 0 == a[b - 1][0] ? (a[b - 1][1] += a[b][1], a.splice(b, 1)) : b++ , c = d = 0, f = e = ""
    }
    "" === a[a.length - 1][1] && a.pop();
    c = !1;
    for (b = 1; b < a.length - 1;) 0 == a[b - 1][0] && 0 == a[b + 1][0] && (a[b][1].substring(a[b][1].length - a[b - 1][1].length) == a[b - 1][1] ? (a[b][1] = a[b - 1][1] + a[b][1].substring(0, a[b][1].length - a[b - 1][1].length), a[b + 1][1] = a[b - 1][1] + a[b + 1][1], a.splice(b - 1, 1), c = !0) : a[b][1].substring(0,
        a[b + 1][1].length) == a[b + 1][1] && (a[b - 1][1] += a[b + 1][1], a[b][1] = a[b][1].substring(a[b + 1][1].length) + a[b + 1][1], a.splice(b + 1, 1), c = !0)), b++;
    c && diff_cleanupMerge(a)
};

function diff_compute_(a, b, c, d) {
    if (!a) return [
        [1, b]
    ];
    if (!b) return [
        [-1, a]
    ];
    var e = a.length > b.length ? a : b,
        f = a.length > b.length ? b : a,
        g = e.indexOf(f);
    return -1 != g ? (c = [
        [1, e.substring(0, g)],
        [0, f],
        [1, e.substring(g + f.length)]
    ], a.length > b.length && (c[0][0] = c[2][0] = -1), c) : 1 == f.length ? [
        [-1, a],
        [1, b]
    ] : (e = diff_halfMatch_(a, b)) ? (f = e[0], a = e[1], g = e[2], b = e[3], e = e[4], f = diff_main(f, g, c, d), c = diff_main(a, b, c, d), f.concat([
        [0, e]
    ], c)) : c && 100 < a.length && 100 < b.length ? diff_lineMode_(a, b,
        d) : diff_bisect_(a, b, d)
};

function diff_bisect_(a, b, c) {
    for (var d = a.length, e = b.length, f = Math.ceil((d + e) / 2), g = f, h = 2 * f, j = Array(h), i = Array(h), k = 0; k < h; k++) j[k] = -1, i[k] = -1;
    j[g + 1] = 0;
    i[g + 1] = 0;
    for (var k = d - e, q = 0 != k % 2, r = 0, t = 0, p = 0, w = 0, v = 0; v < f && !((new Date).getTime() > c); v++) {
        for (var n = -v + r; n <= v - t; n += 2) {
            var l = g + n,
                m;
            m = n == -v || n != v && j[l - 1] < j[l + 1] ? j[l + 1] : j[l - 1] + 1;
            for (var s = m - n; m < d && s < e && a.charAt(m) == b.charAt(s);) m++ , s++;
            j[l] = m;
            if (m > d) t += 2;
            else if (s > e) r += 2;
            else if (q && (l = g + k - n, 0 <= l && l < h && -1 != i[l])) {
                var u = d - i[l];
                if (m >=
                    u) return diff_bisectSplit_(a, b, m, s, c)
            }
        }
        for (n = -v + p; n <= v - w; n += 2) {
            l = g + n;
            u = n == -v || n != v && i[l - 1] < i[l + 1] ? i[l + 1] : i[l - 1] + 1;
            for (m = u - n; u < d && m < e && a.charAt(d - u - 1) == b.charAt(e - m - 1);) u++ , m++;
            i[l] = u;
            if (u > d) w += 2;
            else if (m > e) p += 2;
            else if (!q && (l = g + k - n, 0 <= l && (l < h && -1 != j[l]) && (m = j[l], s = g + m - l, u = d - u, m >= u))) return diff_bisectSplit_(a, b, m, s, c)
        }
    }
    return [
        [-1, a],
        [1, b]
    ]
};

function diff_bisectSplit_(a, b, c, d, e) {
    var f = a.substring(0, c),
        g = b.substring(0, d);
    a = a.substring(c);
    b = b.substring(d);
    f = diff_main(f, g, !1, e);
    e = diff_main(a, b, !1, e);
    return f.concat(e)
};

function diff_commonSuffix(a, b) {
    if (!a || !b || a.charAt(a.length - 1) != b.charAt(b.length - 1)) return 0;
    for (var c = 0, d = Math.min(a.length, b.length), e = d, f = 0; c < e;) a.substring(a.length - e, a.length - f) == b.substring(b.length - e, b.length - f) ? f = c = e : d = e, e = Math.floor((d - c) / 2 + c);
    return e
};

function diff_main(a, b, c, d) {
    "undefined" == typeof d && (d = 0 >= Diff_Timeout ? Number.MAX_VALUE : (new Date).getTime() + 1E3 * Diff_Timeout);
    if (null == a || null == b) throw Error("Null input. (diff_main)");
    if (a == b) return a ? [
        [0, a]
    ] : [];
    "undefined" == typeof c && (c = !0);
    var e = c,
        f = diff_commonPrefix(a, b);
    c = a.substring(0, f);
    a = a.substring(f);
    b = b.substring(f);
    var f = diff_commonSuffix(a, b),
        g = a.substring(a.length - f);
    a = a.substring(0, a.length - f);
    b = b.substring(0, b.length - f);
    a = diff_compute_(a, b, e, d);
    c && a.unshift([0, c]);
    g && a.push([0, g]);
    diff_cleanupMerge(a);
    return a
}

function getstrdiffrate(old_str, new_str) {
    var diffs = diff_main(old_str, new_str);
    var same_length = 0;
    for (var item of diffs) {
        if (item[0] == 0) {
            same_length += item[1].length;
        }
    }
    var same_rate = 0.00;
    same_rate = same_length / (new_str.length);
    return same_rate;
}

export default class extends Base {
    /**
     * index action
     * @return {Promise} []
     */
    indexAction() {
        //auto render template file index_index.html
        return this.display();
    }

    async getdiffquestAction() {
        let statement = this.get('statement');
        let quest_id = this.get('quest_id');
        let organ_id = this.get('organ_id');
        let quest_prop = this.get('quest_prop');
        let quest_knowledge = this.get('quest_knowledge');

        if (think.isEmpty(statement)) return this.fail("参数不能为空");
        if (think.isEmpty(organ_id)) return this.fail("参数不能为空");
        if (think.isEmpty(quest_id)) quest_id = 0;
        let page = 1;
        let limit = 2000;
        let offset = (page - 1) * limit;
        let sql_from = "";
        let sql_where = " where quest_id <> " + quest_id;

        if (!think.isEmpty(quest_prop) && quest_prop != '[]') {
            quest_prop = JSON.parse(quest_prop);
            for (let item of quest_prop) {
                sql_where += " and EXISTS (select 1 from property pt,prop_value pv " +
                    " where pt.ptype_id = pv.ptype_id  " +
                    " and pv.target_id = 1 " +
                    " and pv.key_id = q.quest_id " +
                    " and pv.prop_id = pt.prop_id " +
                    " and pt.path_id like CONCAT('%|'," + item.prop_id + ",'%'))";
            }
        }

        let sql = "select q.quest_id,q.statement,is_pre,type_id,show_type,analysis from " +
            "(select quest_id,statement,1 as is_pre,type_id,show_type,analysis from pre_question" +
            " union all " +
            " select quest_id,statement,0,type_id,show_type,analysis from question) q" + sql_where +
            " limit " + offset + "," + limit;

        let data = await this.model('question').query(sql);

        let ret = [];
        let count = 0;
        //去掉所有html标签
        let regstr1 = /<[^>]+>/g;
        let regstr2 =/[\ |\~|\`|\《|\》|\！|\？|\。|\，|\!|\@|\#|\$|\%|\^|\&|\*|\(|\)|\-|\_|\+|\=|\||\\|\[|\]|\{|\}|\;|\:|\"|\'|\,|\<|\.|\>|\/|\?]/g;
        let new_str = statement.replace(regstr1, "").replace(regstr2, "");

        while (data.length > 0) {
            for (let item of data) {
                let same_rate = getstrdiffrate(item.statement.replace(regstr1, "").replace(regstr2, ""), new_str);
                if (same_rate < 0.8) continue;
                ret.push({
                    quest_id: item.quest_id,
                    statement: item.statement,
                    show_type: item.show_type,
                    type_id: item.type_id,
                    analysis: item.analysis,
                    same_rate: same_rate,
                    is_pre: item.is_pre,
                });
                count++;
                if (count >= 10) {
                    return this.success(ret);
                }
            }

            page++;
            offset = (page - 1) * limit;
            sql = "select q.quest_id,q.statement,is_pre,type_id,show_type,analysis from " +
                "(select quest_id,statement,0 as is_pre,type_id,show_type,analysis from pre_question" +
                " union all " +
                " select quest_id,statement,1,type_id,show_type,analysis from question) q" + sql_where +
                " limit " + offset + "," + limit;
            data = await this.model('question').query(sql);
        }

        return this.success(ret);
    }
}