export class ErrorCaused extends  Error {
    cause: Error;
    constructor(message: string, cause: Error) {
        super();
        this.cause = cause
        this.name = "ErrorCaused"
    }
}


type ErrorCause = {

}