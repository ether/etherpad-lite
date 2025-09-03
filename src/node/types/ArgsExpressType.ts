import type {Express} from "express";
import {MapArrayType} from "./MapType";
import type {SettingsType} from "../utils/Settings";

export type ArgsExpressType = {
    app:Express,
    io: any,
    server:any
    settings: SettingsType
}
