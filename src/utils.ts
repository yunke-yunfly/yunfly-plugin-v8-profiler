const path = require('path');
const stream = require('stream');
const cluster = require('cluster');
const fs = require('fs-extra');
const v8Profiler = require('v8-profiler-next');
const sendmessage = require('sendmessage');

// BFF运行环境 test | release | prod
export const YUNKE_ENV = (process.env.YUNKE_ENV || 'local').replace(/.*[_-]/, '');
export const NODE_ENV = process.env.NODE_ENV || 'production';

export const isProduction = NODE_ENV === 'production';

// BFF运行目录
export const ENV_SRC = NODE_ENV === 'production' ? '/build' : '/src';

export const appName = process.env.APP_NAME;

const appPath = appName ? `/${appName}` : '';
export const perfix = appPath;

function getProfileStream(relPath: any) {
  const absPath = path.resolve(process.cwd(), relPath);
  if (relPath === '-') {
    // Read from stdin
    return process.stdin;
  } else {
    return fs.createReadStream(absPath);
  }
}

function getProfileBuffer(relPath: string) {
  const profileStream = getProfileStream(relPath);
  const chunks: any = [];
  return new Promise((resolve, reject) => {
    profileStream.pipe(
      stream.Writable({
        write(chunk: any, encoding: any, callback: any) {
          chunks.push(chunk);
          callback();
        },
        final() {
          resolve(Buffer.concat(chunks));
        },
      }),
    );
    profileStream.on('error', (ev: any) => reject(ev));
  });
}

export async function onlineCupprofile(relPath: string, origin: string) {
  let urlToOpen = `${origin}${perfix}/v8-profiler/speedscope`;

  const sourceBuffer: any = await getProfileBuffer(relPath);
  const filename = path.basename(relPath);

  let jsSource;
  try {
    const sourceBase64 = sourceBuffer.toString('base64');
    jsSource = `speedscope.loadFileFromBase64(${JSON.stringify(filename)}, ${JSON.stringify(
      sourceBase64,
    )})`;
  } catch (e: any) {
    if (e && e.message && /Cannot create a string longer than/.exec(e.message)) {
      jsSource = `alert("Sorry, ${filename} is too large to be loaded via command-line argument! Try dragging it into speedscope instead.")`;
    } else {
      throw e;
    }
  }

  const file = 'gen-speedscope.js';
  const jsPath = path.join(path.join(__dirname, './static'), file);
  fs.writeFileSync(jsPath, jsSource);
  const querypath = encodeURIComponent(`${origin}${perfix}/v8-profiler/static/${file}`);
  urlToOpen += `#localProfilePath=${querypath}`;

  console.info('speedscope open url', urlToOpen);

  return urlToOpen;
}

const timer = {
  cpuprofile: 0,
  heapsnapshot: 0,
};

/**
 * 抓取cpuprofile文件
 *
 * @param {*} { pid, type, time }
 * @return {*}
 */
export const getCpuProfile = async ({ pid, type, time }: any) => {
  const title = pid && type
    ? `cpuprofile-${type}-pid_${pid}-time_${time}s-${timer.cpuprofile}`
    : `cpuprofile-time-${time}s-${timer.cpuprofile}`;
  v8Profiler.setGenerateType(1);
  v8Profiler.startProfiling(title, true);
  const fn = () => new Promise((resolve: any) => {
    setTimeout(() => {
      const profile = v8Profiler.stopProfiling(title);
      profile.export(function (error: any, result: any) {
        if (error) {
          console.error(error);
          resolve(false);
          return;
        }
        fs.outputFileSync(path.join(__dirname, `./cpuprofile/${title}.cpuprofile`), result);
        profile.delete();
        resolve(true);
      });
    }, time * 1000);
  });
  const result = await fn();
  timer.cpuprofile = timer.cpuprofile + 1;
  return result;
};

/**
 * 获得内存信息
 *
 * @return {*}
 */
export const getHeapsnapshot = async () => {
  const title = `v8-profiler-${timer.heapsnapshot}`;
  const snapshot = v8Profiler.takeSnapshot();
  const fn = () => new Promise((resolve: any) => {
    snapshot.export(function (error: any, result: any) {
      if (error) {
        console.error(error);
        resolve(false);
        return;
      }
      fs.outputFileSync(path.join(__dirname, `./heapsnapshot/${title}.heapsnapshot`), result);
      snapshot.delete();
      resolve(true);
    });
  });
  const result = await fn();
  timer.heapsnapshot = timer.heapsnapshot + 1;
  return result;
};

/**
 * 主进程
 *
 */
export const responseMasterCpuprofile = () => {
  for (const id in cluster.workers) {
    const worker = cluster.workers[id];
    worker.on('message', async (msg: any) => {
      if (msg.from === 'worker' && msg.to === 'app' && msg.type === 'get-master-cpuprofile') {
        const { time } = msg.data || {};
        const result = await getCpuProfile({ time, pid: process.pid, type: 'master' });
        sendmessage(worker, { type: 'response-master-cpuprofile', from: 'app', to: 'worker', data: { result } });
      }
    });
  }
};
