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

  //获取会员(*)
  async getmemberAction() {
    let offset = this.get('offset');
    let limit = this.get('limit');
    let data = await this.model('member').limit(offset, limit).where({}).countSelect();

    let json = {
      total: data.count,
      rows: data.data
    };

    this.success(json);
  }
}