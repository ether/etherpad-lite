import {Express} from "express";
import {MapArrayType} from "./MapType";

export type ArgsExpressType = {
    app:Express,
    io: any,
    server:any
    settings: MapArrayType<any>
}
