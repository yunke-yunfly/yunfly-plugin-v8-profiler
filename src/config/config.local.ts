// 可删除此文件、内容也可为空
// 本地环境时读取，此配置项

import type { Config } from '@yunflyjs/yunfly';
const path = require('path');

const config = () => {
  const config: Config = {};

  // jwt配置
  /*
  * routing-controllers configs
  * 1. controllers、middlewares、authorizationChecker 需要使用`path.join`进行文件位置的绝对定位
  * 2. 如果 middlewares 、authorizationChecker中有rpc请求，则需要使用函数包裹。
  */
  config.routingControllersOptions = {
    routePrefix: '/v8-profiler',
    defaultErrorHandler: false,
    controllers: [path.join(__dirname, '../controller/*')],
    middlewares: [path.join(__dirname, '../middleware/*')],
  };

  config.cluster = {
    enable: false,
  };

  return config;
};

export default config;

