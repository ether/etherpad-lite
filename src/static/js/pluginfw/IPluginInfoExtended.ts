import {IPluginInfo} from "live-plugin-manager";

export type IPluginInfoExtended = IPluginInfo & {
  path?: string
  realPath? : string
}
