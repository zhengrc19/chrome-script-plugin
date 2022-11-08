import { FieldMissingErr, IllegalFieldTypeErr} from "./errors.js";

export const MessageEventType = {
    RecorderEvent: 1,
    ClickEvent: 2,
    InputEvent: 3
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
        throw "illecgal type";
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
    }

    /**
     * @returns {string}
     */
    toString() {
        return `${this.data}`; 
    }

    /**
     * @param {RecorderHandler} msg_handler 
     */
     handle(msg_handler) {}
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
     */
    handle(msg_handler) {
        let type = this.data.type;
        if(type === RecoderEventType.END) {
            msg_handler.store();
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
        }
    }

    /**
     * @returns {MsgClickEvent | MsgRecoderEvent | null}
     */
    get_event() {
        return this.event;
    }

    toString() {
        return JSON.stringify(this.msg);
    }

    /**
     * @param {RecorderHandler} msg_handler 
     */
    handle(msg_handler) {
        msg_handler.received_msgs.push(this);
        this.event.handle(msg_handler);
    }
}