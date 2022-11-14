import { Message } from "./msg-protocol.js";

export default class RecorderHandler {
    constructor() {
        this.received_msgs = new Array();
        this.sended_msgs = new Array();

        this.is_recording = false;
        this.cur_id = 0;
        this.record_id_date = null;
    }

    /**
     * @param {Object} msg_obj
     * @param {*} sendResponse
     */
    msg_callback(msg_obj, sendResponse) {
        console.log("received! ", msg_obj);
        let msg = new Message(msg_obj);
        console.log(msg);
        console.log(msg.get_event());
        msg.handle(this, sendResponse);
    }

    async store() {
        console.log("store history ...");
        console.log(this.received_msgs);
        console.log(this.sended_msgs);
        var new_array;
        function getStorageValuePromise(received_msgs) {
            return new Promise((resolve) => {
                chrome.storage.local.get(['msgs'], function(result) {
                    var msgs;
                    msgs = result['msgs'];
                    if (msgs == null) {
                        msgs = new Array();
                    }
                    console.log("msgs beforehand");
                    console.log(msgs);
                    console.log(received_msgs);
                    msgs.push.apply(msgs, received_msgs);
                    console.log("msgs afterwards");
                    console.log(msgs);
                    new_array = msgs;
                    resolve();
                });
            });
        }
        await getStorageValuePromise(this.received_msgs);
        console.log("array returned from chrome get");
        console.log(new_array);
        chrome.storage.local.set({'msgs': new_array}, function() {
            console.log("new msgs is stored");
        });
        // this.sended_msgs.push.apply(this.sended_msgs, this.received_msgs);
        console.log("clearing this.received_msgs");
        this.received_msgs.length = 0;
        console.log(this.received_msgs);
        // console.log(this.sended_msgs);
    }
}
