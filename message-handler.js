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

    async store(id_date) {
        // console.log("store history ...");
        // console.log(this.received_msgs);
        // console.log(this.sended_msgs);
        console.log("received id date", id_date);
        var new_array;
        function getStorageValuePromise(received_msgs) {
            return new Promise((resolve) => {
                chrome.storage.local.get(['msgs'], function(result) {
                    var msgs;
                    msgs = result['msgs'];
                    if (msgs == null) {
                        msgs = new Array();
                    }
                    // console.log("msgs beforehand");
                    // console.log(msgs);
                    // console.log(received_msgs);
                    msgs.push.apply(msgs, received_msgs);
                    // console.log("msgs afterwards");
                    // console.log(msgs);
                    new_array = msgs;
                    resolve();
                });
            });
        }
        await getStorageValuePromise(this.received_msgs);
        // console.log("array returned from chrome get");
        // console.log(new_array);
        chrome.storage.local.set({'msgs': new_array}, function() {
            console.log("new msgs is stored");
        });
        
        let timestamp = Date.now().valueOf();;
        // let id_date = new Date(timestamp);
        let date_str = id_date.toISOString().replaceAll("-", "_").replaceAll(":", ".");
        
        var simple_objects = [];
        this.received_msgs.forEach(simplify_object);
        
        function simplify_object(value, index, array) {
            var simple_object = new Object();
            simple_object.data = value.msg.data;
            delete simple_object.data.placeholder;
            simple_object.event_type = value.event_type;
            simple_object.timestamp = value.timestamp;
            simple_object.url = value.url;
            simple_objects.push(simple_object);
        }

        // console.log(this.received_msgs);
        // console.log(simple_objects);
        // console.log("sent", this.sended_msgs);
        console.log("record id date", this.record_id_date);

        var str_msgs = JSON.stringify(simple_objects, null, 4); //indentation in json format, human readable
        let json_filename = `record_${date_str}/log/${timestamp}_actions.json`;
        
        var url = "data:application/x-mimearchive;base64," + btoa(str_msgs);
        // console.log(url);
        chrome.downloads.download({
            filename: json_filename,
            url: url
        }).then((downloadId) => {
            console.log("Downloaded!", downloadId, json_filename);
        });

        var str_sent = JSON.stringify(this.sended_msgs, null, 4);
        var url = "data:application/x-mimearchive;base64," + btoa(str_sent);
        let send_filename = `record_${date_str}/log/${timestamp}_log.json`;
        chrome.downloads.download({
            filename: send_filename,
            url: url
        }).then((downloadId) => {
            console.log("Downloaded!", downloadId, send_filename);
        });

        
        // this.sended_msgs.push.apply(this.sended_msgs, this.received_msgs);
        // console.log("clearing this.received_msgs");
        this.received_msgs.length = 0;
        // console.log(this.received_msgs);
        // console.log(this.sended_msgs);
    }
}
