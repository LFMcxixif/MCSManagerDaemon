/*
  Copyright (C) 2022 Suwings <Suwings@outlook.com>

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.
  
  According to the AGPL, it is forbidden to delete all copyright notices, 
  and if you modify the source code, you must open source the
  modified source code.

  版权所有 (C) 2022 Suwings <Suwings@outlook.com>

  该程序是免费软件，您可以重新分发和/或修改据 GNU Affero 通用公共许可证的条款，
  由自由软件基金会，许可证的第 3 版，或（由您选择）任何更高版本。

  根据 AGPL 与用户协议，您必须保留所有版权声明，如果修改源代码则必须开源修改后的源代码。
  可以前往 https://mcsmanager.com/ 阅读用户协议，申请闭源开发授权等。
*/

import path from "path";

import RouterContext from "../entity/ctx";
import * as protocol from "../service/protocol";
import InstanceSubsystem from "../service/system_instance";
import fs from "fs-extra";
const MAX_LOG_SIZE = 512;

// 缓存区
const buffer = new Map<string, string>();
setInterval(() => {
  buffer.forEach((buf, instanceUuid) => {
    if (!buf || !instanceUuid) return;
    const logFilePath = path.join(InstanceSubsystem.LOG_DIR, `${instanceUuid}.log`);
    if (!fs.existsSync(InstanceSubsystem.LOG_DIR)) fs.mkdirsSync(InstanceSubsystem.LOG_DIR);
    try {
      const fileInfo = fs.statSync(logFilePath);
      if (fileInfo && fileInfo.size > 1024 * MAX_LOG_SIZE) fs.removeSync(logFilePath);
    } catch (err) {}
    fs.writeFile(logFilePath, buf, { encoding: "utf-8", flag: "a" }, () => {
      buffer.set(instanceUuid, "");
    });
  });
}, 500);

// 输出流记录到缓存区
async function outputLog(instanceUuid: string, text: string) {
  const buf = (buffer.get(instanceUuid) ?? "") + text;
  if (buf.length > 1024 * 1024) buffer.set(instanceUuid, "");
  buffer.set(instanceUuid, buf ?? null);
}

// 实例输出流事件
// 默认加入到数据缓存中以控制发送速率确保其稳定性
InstanceSubsystem.on("data", (instanceUuid: string, text: string) => {
  InstanceSubsystem.forEachForward(instanceUuid, (socket) => {
    protocol.msg(new RouterContext(null, socket), "instance/stdout", {
      instanceUuid: instanceUuid,
      text: text
    });
  });
  // 输出内容追加到log文件
  outputLog(instanceUuid, text)
    .then(() => {})
    .catch(() => {});
});

// 实例退出事件
InstanceSubsystem.on("exit", (obj: any) => {
  InstanceSubsystem.forEachForward(obj.instanceUuid, (socket) => {
    protocol.msg(new RouterContext(null, socket), "instance/stopped", {
      instanceUuid: obj.instanceUuid,
      instanceName: obj.instanceName
    });
  });
});

// 实例启动事件
InstanceSubsystem.on("open", (obj: any) => {
  InstanceSubsystem.forEachForward(obj.instanceUuid, (socket) => {
    protocol.msg(new RouterContext(null, socket), "instance/opened", {
      instanceUuid: obj.instanceUuid,
      instanceName: obj.instanceName
    });
  });
});

// 实例失败事件（一般用于启动失败，也可能是其他操作失败）
InstanceSubsystem.on("failure", (obj: any) => {
  InstanceSubsystem.forEachForward(obj.instanceUuid, (socket) => {
    protocol.msg(new RouterContext(null, socket), "instance/failure", {
      instanceUuid: obj.instanceUuid,
      instanceName: obj.instanceName
    });
  });
});
