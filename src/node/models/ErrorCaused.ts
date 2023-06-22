import ts from "typescript/lib/tsserverlibrary";

export class ErrorCaused extends Error{
    cause: Error;
    constructor(message: string, cause: Error) {
        super(message);
        this.cause = cause;
        this.name = "ErrorCaused";
    }
}

type ErrorCause = {

}
