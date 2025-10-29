import {ArgsExpressType} from "../../types/ArgsExpressType";

exports.expressPreSession = async (hookName:string, {app}:ArgsExpressType) => {
  app.post('/tokenTransfer', (req, res) => {
    const token = req.body.token;
  })
}
