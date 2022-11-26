import { FieldMissingErr, IllegalFieldTypeErr} from "./errors.js";

export const MessageEventType = {
    ContentInitEvent: 0,
    RecorderEvent: 1,
    ClickEvent: 2,
    InputEvent: 3,
    ScrollEvent: 4,
    AbstractEvent: 5,
    PasteEvent: 6
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
    }
};

const InputEventRule = {
    text: {
        type: String
    },
    selector: {
        type: String
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
    text: {
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
        throw "illegal type";
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

/**
 * 
 * @param {string} url 
 * @param {number} timestamp
 * @param {Date} id_date date of recode starting time, use as unique record id
 * @param {string} suffix 
 */
function download_img(url, timestamp, id_date, suffix) {
    if (id_date == null) {
        throw "null id_date!";
    }
    
    let date_str = id_date.toISOString().replaceAll("-","_").replaceAll(":", ".");
    let img_filename = `record_${date_str}/img/${timestamp}_${suffix}.jpeg`;

    chrome.downloads.download({
        filename: img_filename,
        url: url
    }).then((downloadId) => {
        console.log("downloaded!", downloadId, img_filename);
    });
}

class PluginMsgEvent {
    /**
     * @param {Object} msg
     */
    constructor(msg) {
        this.data = msg["data"];
        this.msg = msg;
    }

    /**
     * @returns {string}
     */
    toString() {
        return `${this.data}`; 
    }

    /**
     * @param {RecorderHandler} msg_handler 
     * @param {*} sendResponse
     */
     handle(msg_handler, sendResponse) {}
}

class MsgRecoderEvent extends PluginMsgEvent {
    /**
     * @param {Object} msg
     */
    constructor(msg) {
        super(msg);
        check_msg_legality(RecoderEventRule, this.data, msg);
    }

    /**
     * @param {RecorderHandler} msg_handler 
     * @param {*} sendResponse
     */
    handle(msg_handler, sendResponse) {
        let type = this.data.type;
        if(type == RecoderEventType.BEGIN) {
            if(msg_handler.is_recording) {
                throw "Shouldn't in recording!";
            }
            let timestamp = this.msg.timestamp;

            msg_handler.is_recording = true;
            msg_handler.record_id_date = new Date(timestamp);

            chrome.tabs.captureVisibleTab().then((data_url) => {
                download_img(data_url, timestamp, msg_handler.record_id_date, "st");
            });
        }
        if(type === RecoderEventType.END) {
            if(!msg_handler.is_recording) {
                throw "Isn't in recording!";
            }
            msg_handler.store();
            msg_handler.cur_id += 1;
            msg_handler.is_recording = false;
            msg_handler.record_id_date = null;
        }
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

    handle(msg_handler, sendResponse) {
        let timestamp = this.msg.timestamp;
        chrome.tabs.captureVisibleTab().then((data_url) => {
            download_img(data_url, timestamp, msg_handler.record_id_date, "click");
        });
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

    handle(msg_handler, sendResponse) {
        let timestamp = this.msg.timestamp;
        chrome.tabs.captureVisibleTab().then((data_url) => {
            download_img(data_url, timestamp, msg_handler.record_id_date, "input");
        });
    }
}

class MsgContentInitEvent extends PluginMsgEvent {
    /**
     * @param {Object} msg 
     */
    constructor(msg) {
        super(msg);
        this.trans_type = null;  // "reload", "forward", "backward", "other"
    }

    /**
     * @param {RecorderHandler} msg_handler 
     * @param {*} sendResponse
     */
    handle(msg_handler, sendResponse) { 
        let msg = {"is_recording": msg_handler.is_recording, "id": msg_handler.cur_id};       

        chrome.history.getVisits(
            {"url": this.msg.url}, 
            (results) => {
                if (results.length == 0) {
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
                    msg["alert"] = trans_type;
                    sendResponse(msg);
                    msg_handler.sended_msgs.push(msg);
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
                    chrome.tabs.captureVisibleTab().then((data_url) => {
                        download_img(data_url, timestamp, msg_handler.record_id_date, "new_page");
                    });
                }

                sendResponse(msg);
                msg_handler.sended_msgs.push(msg);
            }
        );
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

    handle(msg_handler, sendResponse) {
        let timestamp = this.msg.timestamp;
        chrome.tabs.captureVisibleTab().then((data_url) => {
            download_img(data_url, timestamp, msg_handler.record_id_date, "scroll");
        });
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

    handle(msg_handler, sendResponse) {
        let timestamp = this.msg.timestamp;
        chrome.tabs.captureVisibleTab().then((data_url) => {
            download_img(data_url, timestamp, msg_handler.record_id_date, "paste");
        });
    }
}

export class Message {
    /**
     * @param {Object} msg 
     */
    constructor(msg) {
        check_msg_legality(MsgHeaderRule, msg, msg);
        this.msg = msg;
        this.event_type = msg.type;
        this.timestamp = msg.timestamp;
        this.url = msg.url;
        this.id = msg.id;

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
        }
    }

    /**
     * @returns {MsgClickEvent | MsgRecoderEvent | MsgInputEvent | null}
     */
    get_event() {
        return this.event;
    }

    toString() {
        return JSON.stringify(this.msg);
    }

    /**
     * @param {RecorderHandler} msg_handler 
     * @param {*} sendResponse
     */
    handle(msg_handler, sendResponse) {
        msg_handler.received_msgs.push(this);
        this.event.handle(msg_handler, sendResponse);
    }
}