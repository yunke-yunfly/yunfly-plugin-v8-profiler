import EventEmitter from 'events';
import { Ctx, Get, Post, JsonController, QueryParam, BodyParam } from '@yunflyjs/yunfly';
import { getCpuProfile, getHeapsnapshot, isProduction, onlineCupprofile } from '../utils';
const path = require('path');
const fs = require('fs-extra');
const recursive = require('recursive-readdir');
const timer = { defaultTime: 10 };
const sendmessage = require('sendmessage');

const action = 'get-master-cpuprofile';
const resaction = 'response-master-cpuprofile';
const emitAction = 'received-master-cpuprofile';
const myEmitter = new EventEmitter();

process.on('message', (msg: any = {}) => {
  const { from, to, type } = msg || {};
  if (from === 'app' && to === 'worker' && type === resaction) {
    myEmitter.emit(emitAction, msg.data);
  }
});

/**
 * ExampleController
 *
 * @export
 * @class ExampleController
 */
@JsonController()
export default class ExampleController {

  @Get('/cpuprofile/list')
  async getCpuprofileList(): Promise<any> {
    try {
      const res = await recursive(path.join(__dirname, '../cpuprofile')) || [];
      const result = res.reduce((prev: any, next: any) => {
        if (next.indexOf('.cpuprofile') > -1) {
          return [...prev, {
            file: next,
            fileName: next.replace(/^.*[\/\\].+[\/\\]/, ''),
          }];
        }
        else {
          return prev;
        }
      }, []);
      return result;
    } catch (err) {
      console.log(err);
      return [];
    }
  }

  @Post('/cpuprofile/delete')
  deleteCpuprofile(
    @BodyParam('file') file: string,
  ) {
    try {
      fs.unlinkSync(file);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  @Post('/cpuprofile/deleteall')
  deleteallCpuprofile() {
    try {
      fs.removeSync(path.join(__dirname, '../cpuprofile'));
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  @Get('/cpuprofile/downloads')
  download(
    @Ctx() ctx: any,
    @QueryParam('file') file: string,
    @QueryParam('fileName') fileName: string,
  ) {
    ctx.set('Content-Type', 'application/octet-stream');
    ctx.set('Content-Disposition', `attachment; filename=${fileName || 'download.cpuprofile'}`);
    const htmlStr = fs.readFileSync(file).toString();
    return htmlStr;
  }

  @Get('/cpuprofile/online')
  speedscopeOnline(
    @Ctx() ctx: any,
    @QueryParam('file') file: string = '',
  ) {
    const origin = isProduction ? `https://${ctx.host}` : ctx.origin;
    return onlineCupprofile(file, origin);
  }

  /**
   * get cpuprofile
   *
   * @param {number} time
   * @returns {Promise<any>}
   * @memberof ExampleController
   */
  @Get('/cpuprofile')
  async cpuprofile(
    @Ctx() ctx: any,
    @QueryParam('time') time: number,
    @QueryParam('type') type: string,
  ): Promise<any> {
    time = (time ? +time : timer.defaultTime) || timer.defaultTime;
    const isCluster = ctx.config?.cluster?.enable;

    if (isCluster && type === 'master') {
      sendmessage(process, { from: 'worker', to: 'app', type: action, data: { time } });
      const getClusterInfos = () => new Promise((resolve) => {
        const emmiterFn = (data: string = '') => {
          clearTimeout(timer); resolve(data);
          try { myEmitter.removeListener(emitAction, emmiterFn); } catch (e: any) {/* do nothing */ }
        };
        const timer = setTimeout(() => {
          resolve('');
          try { myEmitter.removeListener(emitAction, emmiterFn); } catch (err: any) {/* do nothing */ }
        }, time * 1000 + 1000);
        myEmitter.once(emitAction, emmiterFn);
      });
      const result: any = await getClusterInfos();
      return result ? true : false;
    }
    return await getCpuProfile({ time, pid: process.pid, type });
  }

  /**
   * get heapsnapshot
   *
   * @returns {Promise<any>}
   * @memberof ExampleController
   */
  @Get('/heapsnapshot')
  async heapsnapshot(): Promise<any> {
    return await getHeapsnapshot();
  }

  @Get('/hello')
  hello() {
    return 'hello';
  }

}
