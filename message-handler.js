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
    msg_callback(msg_obj, sender, sendResponse) {
        // console.log("received! ", msg_obj);
        let msg = new Message(msg_obj);
        console.log(msg);
        // console.log(msg.get_event());
        msg.handle(this, sender, sendResponse);
    }

    store() {
        this.cur_id += 1;
        this.is_recording = false;

        let id_date = this.record_id_date;
        let date_str = id_date.toISOString().replaceAll("-", "_").replaceAll(":", ".");
        
        var simple_objects = [];
        this.received_msgs.forEach((val, id, arr) => {
            let data = val.toJson();
            if (data != null) {
                simple_objects.push(data);
            }
        });

        // console.log(this.received_msgs);
        // console.log(simple_objects);
        console.log("sent", this.sended_msgs);

        let str_msgs = JSON.stringify(simple_objects, null, 4); //indentation in json format, human readable
        console.log(str_msgs);
        let json_url = "data:application/x-mimearchive;base64," + btoa(str_msgs);
        let json_filename = `record_${date_str}/log/actions.json`;
        chrome.downloads.download({
            filename: json_filename,
            url: json_url
        }).then((downloadId) => {
            console.log("Downloaded!", downloadId, json_filename);
        });

        let str_sent = JSON.stringify(this.sended_msgs, null, 4);
        let send_url = "data:application/x-mimearchive;base64," + btoa(str_sent);
        let send_filename = `record_${date_str}/log/log.json`;
        chrome.downloads.download({
            filename: send_filename,
            url: send_url
        }).then((downloadId) => {
            console.log("Downloaded!", downloadId, send_filename);
        });

        
        console.log("clearing msgs");
        this.received_msgs = [];
        this.sended_msgs = [];
        console.log(this.received_msgs, this.sended_msgs);

        this.record_id_date = null;
    }
}
