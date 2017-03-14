'use strict';
/**
 * db config
 * @type {Object}
 */
export default {
    type: 'mysql',
    adapter: {
        mysql: {
            //host: '127.0.0.1',
            host: '47.89.13.166',
            //host:'tiku365.net',
            port: '3306',
            database: 'jd_edu_test',
            user: 'developer',
            password: 'Jindian0907',
            // password: 'jd20140603',
            //password: 'root',
            prefix: '',
            encoding: 'utf8'
        },
        mongo: {

        }
    }
};
