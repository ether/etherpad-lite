import path from "path";
import express from "express";
import type { ArgsExpressType } from "../../types/ArgsExpressType";

/**
 * Add the admin navigation link
 * @param hookName {String} the name of the hook
 * @param args {Object} the object containing the arguments
 * @param {Function} cb  the callback function
 * @return {*}
 */
exports.expressCreateServer = (
	hookName: string,
	args: ArgsExpressType,
	cb: Function,
): any => {
	args.app.use(
		"/admin/",
		express.static(path.join(__dirname, "../../../templates/admin"), {
			maxAge: 1000 * 60 * 60 * 24,
		}),
	);
	args.app.get("/admin/*", (_request: any, response: any) => {
		response.sendFile(
			path.resolve(__dirname, "../../../templates/admin", "index.html"),
		);
	});
	args.app.get("/admin", (req: any, res: any, next: Function) => {
		if ("/" !== req.path[req.path.length - 1]) return res.redirect("./admin/");
	});
	return cb();
};
