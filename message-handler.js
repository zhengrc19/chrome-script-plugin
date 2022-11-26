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
        
        let timestamp = Date.now().valueOf();;
        let id_date = new Date(timestamp);
        let date_str = id_date.toISOString().replaceAll("-", "_").replaceAll(":", ".");
        let json_filename = `record_${date_str}/log/${timestamp}.json`;
        var _myArray = JSON.stringify(new_array , null, 4); //indentation in json format, human readable

        // console.log(_myArray);


        // var vLink = document.createElement('a'),
        // var vBlob = new Blob([_myArray], {type: "octet/stream"});
        // console.log("blob:", vBlob);

        var url = "data:application/x-mimearchive;base64," + btoa(_myArray);
        console.log(url);

        // var vName = json_filename;
        // var vUrl = get_json_url(vBlob)
        // vLink.setAttribute('href', vUrl);
        // vLink.setAttribute('download', vName );
        // vLink.click();

        chrome.downloads.download({
            filename: json_filename,
            url: url
        }).then((downloadId) => {
            console.log("Downloaded!", downloadId, json_filename);
        });

        // chrome.fileSystem.chooseEntry( {
        //     type: 'saveFile',
        //     suggestName: json_filename,
        //     accepts: [
        //         { description: 'Json files (*.json)', extensions: ['json']}
        //     ],
        //     acceptsAllTypes: true
        // }, (fileEntry) => {
        //     fileEntry.createWriter(function(fileWriter) {

        //         var truncated = false;
          
        //         fileWriter.onwriteend = function(e) {
        //           if (!truncated) {
        //             truncated = true;
        //             // You need to explicitly set the file size to truncate
        //             // any content that might have been there before
        //             this.truncate(vBlob.size);
        //             return;
        //           }
        //           console.log('Export to '+fileDisplayPath+' completed');
        //         };
          
        //         fileWriter.onerror = function(e) {
        //           console.log('Export failed: '+e.toString());
        //         };
          
        //         fileWriter.write(vBlob);
          
        //       });
        // });
        
        // this.sended_msgs.push.apply(this.sended_msgs, this.received_msgs);
        console.log("clearing this.received_msgs");
        this.received_msgs.length = 0;
        console.log(this.received_msgs);
        // console.log(this.sended_msgs);
    }
}
