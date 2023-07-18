import { ContentType, Ctx, Get, JsonController } from '@yunflyjs/yunfly';
import { appName, perfix } from '../utils';
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

/**
 * ExampleController
 *
 * @export
 * @class ExampleController
 */
@JsonController()
export default class ExampleController {

  @Get('/view')
  @ContentType('text/html;charset=utf-8')
  view(
    @Ctx() ctx: any,
  ) {
    const isCluster = ctx.config?.cluster?.enable ? 1 : 0;
    const htmlStr = fs.readFileSync(path.join(__dirname, '../view/index.html')).toString();
    return ejs.render(htmlStr, { appName, isCluster });
  }

  @Get('/static/:file')
  static(
    @Ctx() ctx: any,
  ) {
    const fileName = ctx.path.replace(/^.*[\/\\].+[\/\\]/, '');
    const file = path.join(__dirname, '../static/') + fileName;
    if (file.includes('.css')) {
      ctx.set('Content-Type', 'text/css; charset=utf-8');
    } else if (file.includes('.js')) {
      ctx.set('Content-Type', 'application/javascript; charset=utf-8');
    } else if (file.includes('.png')) {
      ctx.set('Content-Type', 'image/png');
    }
    const fileContent = fs.readFileSync(file).toString();
    return fileContent;
  }

  @Get('/speedscope')
  @ContentType('text/html;charset=utf-8')
  speedscope() {
    const htmlStr = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>speedscope</title>
        <link href="${perfix}/v8-profiler/static/source-code-pro.css" rel="stylesheet">
        <script></script>
        <link rel="stylesheet" href="${perfix}/v8-profiler/static/reset.8c46b7a1.css">
        <link rel="icon" type="image/png" sizes="32x32" href="${perfix}/v8-profiler/static/favicon-32x32.bc503437.png">
        <link rel="icon" type="image/png" sizes="16x16" href="${perfix}/v8-profiler/static/favicon-16x16.f74b3187.png">
    </head>
    <body>
        <script src="${perfix}/v8-profiler/static/speedscope.231cee07.js"></script>
    </body>
    </html>`;
    return ejs.render(htmlStr);
  }

}
