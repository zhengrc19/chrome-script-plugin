import { Message } from "./msg-protocol.js";

export default class RecorderHandler {
    constructor() {
        this.received_msgs = new Array();
        this.sended_msgs = new Array();
    }

    /**
     * @param {Object} msg_obj
     */
    msg_callback(msg_obj) {
        console.log("received! ", msg_obj);
        let msg = new Message(msg_obj);
        console.log(msg);
        console.log(msg.get_event());
        msg.handle(this);
    }

    store() {
        console.log("store history ...");
    }
}
