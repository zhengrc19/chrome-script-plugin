import { Message } from "./msg-protocol.js";
import { task_controller, zip, folder_log, folder_bbox, folder_mhtml, folder_img } from "./capture-handler.js"

export default class RecorderHandler {
    constructor() {
        this.received_msgs = new Array();
        this.sended_msgs = new Array();

        this.is_recording = false;
        this.cur_id = 0;
        this.record_id_date = null;
        this.event_name = '';
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
        // console.log("sent", this.sended_msgs);
        console.log("record id date", this.record_id_date);

        let str_msgs = JSON.stringify(simple_objects, null, 4); //indentation in json format, human readable
        console.log(str_msgs);
        let json_url = "data:application/x-mimearchive;base64," + btoa(unescape(encodeURIComponent(str_msgs)));
        let json_filename = `record_${this.event_name}_${date_str}/log/actions.json`;
        // chrome.downloads.download({
            //     filename: json_filename,
            //     url: json_url
            // }).then((downloadId) => {
        //     console.log("Downloaded!", downloadId, json_filename);
        // });

        let str_sent = JSON.stringify(this.sended_msgs, null, 4);
        let send_url = "data:application/x-mimearchive;base64," + btoa(unescape(encodeURIComponent(str_sent)));
        let send_filename = `record_${this.event_name}_${date_str}/log/log.json`;
        // chrome.downloads.download({
        //     filename: send_filename,
        //     url: send_url
        // }).then((downloadId) => {
        //     console.log("Downloaded!", downloadId, send_filename);
        // });
        
        folder_log.file("actions.json", str_msgs);
        folder_log.file("log.json", str_sent);

        function blobToBase64(blob) {
            return new Promise((resolve, _) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
        }

        let event_name = this.event_name;
        zip.generateAsync({type: "blob"}).then(async function(content) {
            let zip_url = await blobToBase64(content);
            let zip_file_name = `record_${event_name}_${date_str}.zip`;
            chrome.downloads.download({
                filename: zip_file_name,
                url: zip_url
            }).then((downloadId) => {
                console.log("Downloaded!", downloadId, zip_file_name);
            });
        })
        
        console.log("clearing msgs");
        this.received_msgs = [];
        this.sended_msgs = [];
        console.log(this.received_msgs, this.sended_msgs);
        task_controller.clear();

        // clear bbox folder, (.json)
        // clear img folder,  (.jpeg)
        // clear mhtml folder (.mthml)
        let bboxes = folder_bbox.file(/json/);
        let imgs = folder_img.file(/jpeg/);
        let mhtmls = folder_bbox.file(/mhtml/);

        console.log(bboxes);
        console.log(imgs);
        console.log(mhtmls);

        bboxes.forEach((val, id, arr) => {
            zip.remove(val.name);
            console.log("removed", val.name);
        });
        imgs.forEach((val, id, arr) => {
            zip.remove(val.name);
            console.log("removed", val.name);
        });
        mhtmls.forEach((val, id, arr) => {
            zip.remove(val.name);
            console.log("removed", val.name);
        });

        this.record_id_date = null;
    }
}
