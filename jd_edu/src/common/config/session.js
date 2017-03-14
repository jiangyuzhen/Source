'use strict';

/**
 * session configs
 */
export default {
  name: 'jd_edu',
  type: 'file',
  secret: '8N(BSLWM',
  timeout: 24 * 3600,   //默认一天
  cookie: { // cookie options
    length: 32,
    httponly: true
  },
  adapter: {
    file: {
      path: think.RUNTIME_PATH + '/session',
    }
  }
};