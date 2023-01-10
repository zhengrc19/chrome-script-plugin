import { FieldMissingErr, IllegalFieldTypeErr} from "./errors.js";
import { task_controller, MaskMsgType, ImgCapTask, MHTMLCapTask, CapTaskList, TaskType, folder_bbox } from "./capture-handler.js";

export const MessageEventType = {
    ContentInitEvent: 0,
    RecorderEvent: 1,
    ClickEvent: 2,
    InputEvent: 3,
    ScrollEvent: 4,
    AbstractEvent: 5,
    PasteEvent: 6,
    MaskEvent: 7,
    BboxEvent: 8
};

const RecoderEventType = {
    BEGIN: 1,
    END: 2
};


/**
 * message overall structure
 * {
 *      url: string,    // content script url
 *      id: int,        // unique content script id, assigned by background
 *      type: int,      // message event type
 *      timestamp: int, // UNIX timestamp
 *      data: {    
 *          ...
 *      }
 * }
 */
const MsgHeaderRule = {
    url: {
        type: String
    },
    id: {
        type: Number
    },
    timestamp: {
        type: Number
    },
    type: {
        type: Number,
        enum: MessageEventType  // enum field
    },
    data: {
        type: Object
    }
};

const BboxFieldRule = {
    height: { type: Number },
    width: { type: Number },
    x: { type: Number },
    y: { type: Number },
    top: { type: Number },
    right: { type: Number },
    bottom: { type: Number },
    left: { type: Number }
}

const RecoderEventRule = {
    type: {
        type: Number,
        enum: RecoderEventType
    }
}

const ClickEventRule = {
    /**
     * @desc choices include 'click' 'submit'. Not sure about the complete choice list.
     */
    type: {
        type: String
    },


    /**
     * An example: 
     *      'BODY > DIV:nth-child(2) > DIV:nth-child(4)'
     */
    selector: {
        type: String
    },

    /**
     * @desc 相对被点中目标的 offset
     */
    offsetXY: {   // 长度为 2 的 Array，每一项都是一个 number
        type: Array,
        arr_len: 2,
        child: {
            type: Number
        }
    },
    /**
     * @desc 相对网页的位置
     */
    pageXY: {
        type: Array,
        arr_len: 2,
        child: {
            type: Number
        }
    },

    bbox: {
        type: Object,
        child: BboxFieldRule
    }
};

const InputEventRule = {
    text: {
        type: String
    },
    selector: {
        type: String
    },
    bbox: {
        type: Object,
        child: BboxFieldRule
    }
}

const ScrollEventRule = {
    scrollXY: {
        type: Array,
        arr_len: 2,
        child: {
            type: Number
        }
    }
}

const AbstractEventRule = {
    abstract: {
        type: String
    }
}

/**
 * example: {
        "st_node": {
            "selector": st_selector,
            "offset": st_offset
        },
        "ed_node": {
            "selector": ed_selector,
            "offset": ed_offset
        },
        "text": text
    }
 */
const PasteEventRule = {
    st_node: {
        type: Object,
        child: {
            selector: {
                type: String
            },
            offset: {
                type: Number
            }
        }
    },
    ed_node: {
        type: Object,
        child: {
            selector: {
                type: String
            },
            offset: {
                type: Number
            }
        }
    },
    selection: {
        type: String
    }
}

const MaskEventRule = {
    id: {
        type: Number
    },
    type: {
        type: Number,
        enum: MaskMsgType
    }
}

const BboxEventRule = {
    bbox: {
        type: String
    }
}

/**
 * @param {*} type 
 * @returns {string}
 */
 function _type_to_str(type) {
    if(type == Boolean)
        return 'boolean';
    else if(type == Number)
        return 'number';
    else if(type == Array)
        return 'array';
    else if(type == Object)
        return 'object';
    else if(type == String)
        return 'string';
    else
        throw new Error("illegal type");
}

/**
 * check msg fields based on the given rule
 * @param {Object} rule 
 * @param {Object} msg part of the msg that needs to be examined
 * @param {Object} comp_msg  complete msg
 */
function check_msg_legality(rule, msg, comp_msg) {
    let fields = Object.keys(rule);
    fields.forEach((val) => {
        let frule = rule[val];
        let fval = msg[val];
        if (fval == undefined || fval == null) 
            throw new FieldMissingErr(val, msg, comp_msg);
        if (fval.constructor != frule.type) 
            throw new IllegalFieldTypeErr(IllegalFieldTypeErr.Type.OTHER, val, _type_to_str(frule.type), null, null, msg, comp_msg);

        if(frule.type == Array) {
            if(frule.arr_len != null) {
                let req_len = frule.arr_len;
                if(fval.length != req_len)
                    throw new IllegalFieldTypeErr(IllegalFieldTypeErr.Type.ARRLEN, val, null, null, req_len, msg, comp_msg);
            }

            if(frule.child != null) {
                fval.forEach((cval, cid) => {
                    let key = `${val}[${cid}]`;
                    check_msg_legality({key: frule.child}, {key: cval}, comp_msg);
                });
            }
        } else if(frule.type == Number && frule.enum != null) {
            if(Object.values(frule.enum).indexOf(fval) == -1)
                throw new IllegalFieldTypeErr(IllegalFieldTypeErr.Type.ENUM, val, null, frule.enum, null, msg, comp_msg);
        } else if(frule.type == Object) {
            if(frule.child != null) {
                check_msg_legality(frule.child, fval, comp_msg);
            }
        }
    });
}


class PluginMsgEvent {
    /**
     * @param {Object} msg
     */
    constructor(msg) {
        this.data = msg["data"];
        this.msg = msg;
        this.name = msg.name;
    }

    /**
     * @returns {object}
     */
    toJson() {
        return this.data;
    }

    /**
     * @param {RecorderHandler} msg_handler 
     * @param {*} sendResponse
     */
     handle(msg_handler, sender, sendResponse) {}
}

class MsgRecoderEvent extends PluginMsgEvent {
    /**
     * @param {Object} msg
     */
    constructor(msg) {
        super(msg);
        check_msg_legality(RecoderEventRule, this.data, msg);
        this.legal = true;
    }

    /**
     * @param {RecorderHandler} msg_handler 
     * @param {*} sendResponse
     */
    handle(msg_handler, sender, sendResponse) {
        let type = this.data.type;
        if(type == RecoderEventType.BEGIN) {
            if(msg_handler.is_recording) {
                this.legal = false;
                throw new Error("Shouldn't in recording!");
            }
            let timestamp = this.msg.timestamp;

            msg_handler.is_recording = true;
            msg_handler.record_id_date = new Date(timestamp);
            msg_handler.event_name = this.msg.name;
            
            task_controller.start();

            let task_list = new CapTaskList([TaskType.Img, TaskType.MHTML], sender.tab.id, timestamp,  
                        msg_handler.record_id_date, msg_handler.event_name, sendResponse, "st");
            task_controller.push(task_list);
        }
        else if(type === RecoderEventType.END) {
            if(!msg_handler.is_recording) {
                this.legal = false;
                throw new Error("Isn't in recording!");
            }
            msg_handler.store(); 
        }
        return true;
    }

    toJson() {
        return this.legal? { type: this.data.type } : null;
    }
}

class MsgClickEvent extends PluginMsgEvent{
    /**
     * @param {Object} msg
     */
    constructor(msg) {
        super(msg);
        check_msg_legality(ClickEventRule, this.data, msg);
    }

    handle(msg_handler, sender, sendResponse) {
        let timestamp = this.msg.timestamp;
        let img_task = new CapTaskList([TaskType.Img, TaskType.MHTML], sender.tab.id, timestamp,  
            msg_handler.record_id_date, msg_handler.event_name, sendResponse, "click");
        task_controller.push(img_task);
    }
}

class MsgInputEvent extends PluginMsgEvent {
    /**
     * @param {Object} msg 
     */
    constructor(msg) {
        super(msg);
        check_msg_legality(InputEventRule, this.data, msg);
    }

    handle(msg_handler, sender, sendResponse) {
        let timestamp = this.msg.timestamp;
        let img_task = new CapTaskList([TaskType.Img, TaskType.MHTML], sender.tab.id, timestamp,  
            msg_handler.record_id_date, msg_handler.event_name, sendResponse, "input");
        task_controller.push(img_task);
    }
}

class MsgContentInitEvent extends PluginMsgEvent {
    /**
     * @param {Object} msg 
     */
    constructor(msg) {
        super(msg);
        this.trans_type = null;  // "reload", "forward", "backward", "other", "ignore", "forbidden"
    }

    /**
     * @param {RecorderHandler} msg_handler 
     * @param {*} sendResponse
     */
    handle(msg_handler, sender, sendResponse) { 
        let msg = {
            "is_recording": msg_handler.is_recording, 
            "record_id": msg_handler.cur_id, 
            "record_timestamp": msg_handler.record_id_date == null? null : msg_handler.record_id_date.valueOf(),
            "transition": null
        }; 
        let send = () => {
            msg["transition"] = this.trans_type;
            sendResponse(msg);
            msg_handler.sended_msgs.push(msg);
        };

        chrome.history.getVisits(
            {"url": this.msg.url}, 
            (results) => {
                if (results.length == 0) {
                    console.warn("visit not found! ");
                    this.trans_type = "ignore";
                    send();
                    return;
                }
                let item = results[results.length-1];
                console.log(results);
                console.log(item);
                console.log(item.transition);

                let trans_type = item.transition;
                if (trans_type == "typed" 
                || trans_type == "auto_bookmark" 
                || trans_type == "generated") {
                    console.warn("forbidden transition by user, to alert user later!");
                    this.trans_type = "forbidden";
                    send();
                    return;
                }

                if (trans_type == "reload") {
                    this.trans_type = trans_type;
                } else {
                    this.trans_type = "other";
                }
                
                console.log(this.trans_type);
                if (msg_handler.is_recording) {
                    let timestamp = this.msg.timestamp;
                    let tab_id = sender.tab.id;

                    msg["transition"] = this.trans_type;
                    let task_list = new CapTaskList([TaskType.Img, TaskType.MHTML], tab_id, timestamp,  
                        msg_handler.record_id_date, msg_handler.event_name, sendResponse, "new_page");
                    task_list.set_boot_info(msg);
                    task_controller.push(task_list);
                } else {
                    send();
                }

            }
        );
    }

    /**
     * @returns {Object}
     */
    toJson() {
        console.assert(this.trans_type != null);
        return this.trans_type == "ignore"? null: { "transition": this.trans_type }; 
    }
}

class MsgScrollEvent extends PluginMsgEvent {
    /**
     * @param {Object} msg 
     */
     constructor(msg) {
        super(msg);
        check_msg_legality(ScrollEventRule, this.data, msg);
    }

    handle(msg_handler, sender, sendResponse) {
        let timestamp = this.msg.timestamp;
        let img_task = new CapTaskList([TaskType.Img, TaskType.MHTML], sender.tab.id, timestamp,  
            msg_handler.record_id_date, msg_handler.event_name, sendResponse, "scroll");
        task_controller.push(img_task);
    }
}

class MsgAbstractEvent extends PluginMsgEvent {
    /**
     * @param {Object} msg 
     */
    constructor(msg) {
        super(msg);
        check_msg_legality(AbstractEventRule, this.data, msg);
    }
}

class MsgPasteEvent extends PluginMsgEvent {
    /**
     * @param {Object} msg 
     */
    constructor(msg) {
        super(msg);
        check_msg_legality(PasteEventRule, this.data, msg);
    }

    handle(msg_handler, sender, sendResponse) {
        let timestamp = this.msg.timestamp;
        let img_task = new ImgCapTask(sender.tab.id, timestamp, msg_handler.record_id_date, msg_handler.event_name, sendResponse, "paste");
        task_controller.push(img_task);
    }
}

class MsgMaskEvent extends PluginMsgEvent {
    /**
     * @param {Object} msg 
     */
     constructor(msg) {
        super(msg);
        check_msg_legality(MaskEventRule, this.data, msg);
        this.task_id = this.data["id"];
        this.type = this.data["type"];
    }

    toJson() {
        return null;
    }
}

class MsgBboxEvent extends PluginMsgEvent {
    /**
     * @param {Object} msg 
     */
    constructor(msg) {
        super(msg);
        check_msg_legality(BboxEventRule, this.data, msg);
        this.str = this.data.bbox;
    }

    handle(msg_handler, sender, sendResponse) {
        let date_str = msg_handler.record_id_date.toISOString().replaceAll("-", "_").replaceAll(":", ".");
        let event_name = msg_handler.event_name;
        let bbox_fname = `record_${event_name}_${date_str}/bbox/${this.msg.timestamp}.json`;
        // let bbox_url = "data:application/json;base64," + btoa(unescape(encodeURIComponent(this.str)));
        folder_bbox.file(`${this.msg.timestamp}.json`, this.str);
        // chrome.downloads.download({
        //     filename: bbox_fname,
        //     url: bbox_url
        // }).then((downloadId) => {
        //     console.log("downloaded!", downloadId, bbox_fname);
        // });
    }

    toJson() {
        return null;
    }
}

export class Message {
    /**
     * @param {Object} msg 
     */
    constructor(msg) {
        check_msg_legality(MsgHeaderRule, msg, msg);
        this.msg = msg;
        this.event_name = msg.name;
        this.event_type = msg.type;
        this.timestamp = msg.timestamp;
        this.url = msg.url;
        this.id = msg.id;
        this.tab_id = null;

        if (this.event_type === MessageEventType.RecorderEvent) {
            this.event = new MsgRecoderEvent(msg);
        } else if(this.event_type === MessageEventType.ClickEvent) {
            this.event = new MsgClickEvent(msg);
        } else if(this.event_type === MessageEventType.InputEvent) {
            this.event = new MsgInputEvent(msg);
        } else if(this.event_type == MessageEventType.ContentInitEvent) {
            this.event = new MsgContentInitEvent(msg);
        } else if(this.event_type == MessageEventType.ScrollEvent) {
            this.event = new MsgScrollEvent(msg);
        } else if(this.event_type == MessageEventType.AbstractEvent) {
            this.event = new MsgAbstractEvent(msg);
        } else if(this.event_type == MessageEventType.PasteEvent) {
            this.event = new MsgPasteEvent(msg);
        } else if(this.event_type == MessageEventType.MaskEvent) {
            this.event = new MsgMaskEvent(msg);
        } else if(this.event_type == MessageEventType.BboxEvent) {
            this.event = new MsgBboxEvent(msg);
        }
    }

    /**
     * @returns {PluginMsgEvent | null}
     */
    get_event() {
        return this.event;
    }

    /**
     * @returns {Object}
     */
    toJson() {
        console.assert(this.tab_id != null);
        console.assert(this.event != null);
        let ev_data = this.event.toJson();
        if (ev_data == null) {
            return null;
        } else {
            let ret = {
                "event_type": this.event_type,
                "timestamp": this.timestamp,
                "event_name": this.event_name,
                "tabId": this.tab_id,
                "url": this.url,
                "data": ev_data
            }
            return ret
        }
    }

    /**
     * @param {RecorderHandler} msg_handler 
     * @param {*} sendResponse
     */
    handle(msg_handler, sender, sendResponse) {
        this.tab_id = sender.tab.id;

        if (this.event_type == MessageEventType.ContentInitEvent) {
            this.event.handle(msg_handler, sender, sendResponse);
            if (msg_handler.is_recording) {
                msg_handler.received_msgs.push(this);
            }
        } else if (this.event_type == MessageEventType.RecorderEvent) {
            if (this.id != msg_handler.cur_id) {
                throw new Error("ignore recoder msg because of illegal msg id!");
            }

            msg_handler.received_msgs.push(this);
            this.event.handle(msg_handler, sender, sendResponse);
        } else if (this.event_type == MessageEventType.MaskEvent) {
            task_controller.mask_msg_handler(this, sendResponse);
            msg_handler.received_msgs.push(this);
        } else {
            if(this.id != msg_handler.cur_id || !msg_handler.is_recording) {
                throw new Error("ignore action msg!");
            }

            this.event.handle(msg_handler, sender, sendResponse);
            msg_handler.received_msgs.push(this);
        }
    }
}