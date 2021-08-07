import { ProcessConfig } from "../instance/process_config";
/*
 * @Author: Copyright(c) 2021 Suwings
 * @Date: 2021-08-01 18:44:40
 * @LastEditTime: 2021-08-01 19:23:46
 * @Description:
 * @Projcet: MCSManager Daemon
 */

import pidusage from "pidusage";
import InstanceCommand from "./command";
import Instance from "../instance/instance";

export default class ProcessInfoCommand extends InstanceCommand {
  constructor() {
    super("ProcessInfo");
  }
  async exec(instance: Instance): Promise<Object> {
    let info: any = {
      cpu: 0, // percentage (from 0 to 100*vcore)
      memory: 0, // bytes
      ppid: 0, // PPID
      pid: 0, // PID
      ctime: 0, // ms user + system time
      elapsed: 0, // ms since the start of the process
      timestamp: 0 // ms since epoch
    };
    if (instance.process && instance.process.pid) {
      info = await pidusage(instance.process.pid);
    }
    return info;
  }
}
