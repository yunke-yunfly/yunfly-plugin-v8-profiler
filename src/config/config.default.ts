import type { Config } from '@yunflyjs/yunfly';

/**
 * 包内置默认配置项
 *
 * @export
 * @param {KoaApp} app
 * @returns
 */
export default function config(): Config {
  const config: Config = {};

  // 插件配置
  config.v8profile = {
    enable: true,
    routePrefix: '/v8-profiler',
  };

  return config;
}
