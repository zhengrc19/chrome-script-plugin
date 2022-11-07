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

const MessageEventType = {
    "RecorderEvent": 1,
    "ClickEvent": 2,
    "InputEvent": 3
};

const RecoderEventType = {
    "BEGIN": 1,
    "END": 2
};

class PluginError extends Error {
    /**
     * @param {string} err_type
     * @param {string} msg
     */
    constructor(err_type, msg) {
        super(`[${err_type}] ${msg} `);
        this.err_type = err_type;
        this.msg = msg;
    }
}

class MessageParseErr extends PluginError {
    /**
     * @param {string} parse_err_type
     * @param {string} msg
     */
    constructor(parse_err_type, msg) {
        super("MsgParseErr", `${parse_err_type}: ${msg}`);
        this.parse_err_type = parse_err_type;
        this.inner_msg = msg;
    }
}

class FieldMissingErr extends MessageParseErr {
    /**
     * @function constructor
     * @param {int} event_type
     * @param {string} field_name
     * @param {Object} orig_msg
     */
    constructor(event_type, field_name, orig_msg) {
        super("Missing Field: ", 
            `event_type=${event_type}, field_name="${field_name}", msg=${JSON.stringify(orig_msg)}`);
        this.event_type = event_type;
        this.field_name = field_name;
        this.orig_msg = orig_msg;
    }
}

class IllegalFieldTypeErr extends MessageParseErr {
    /**
     * @function constructor
     * @function constructor
     * @param {int} event_type
     * @param {string} field_name
     * @param {string} require_type
     * @param {Object} orig_msg
     */
    constructor(event_type, field_name, require_type, orig_msg) {
        this.found_type = typeof(orig_msg[field_name]);
        super("Illegal Field: ",
            `event_type=${event_type}, field_name="${field_name}", require ${require_type}, get ${this.found_type}`);
        this.event_type = event_type;
        this.field_name = field_name;
        this.require_type = require_type;
    }
}

class RecoderEvent {
    /**
     * @param {Object} msg
     */
    constructor(msg) {
        this.data = msg["data"];

        if (this.data["type"] === null) {
            throw new FieldMissingErr(MessageEventType.RecorderEvent, "type", msg);
        }
        if (typeof(this.data.type) !== 'number') {
            throw new IllegalFieldTypeErr(MessageEventType.RecorderEvent, "type", "number", msg);
        }

        this.type = this.data.type
    }

    /**
     * @returns {string}
     */
    toString() {
        return `RecoderEvent ${this.type}`; 
    }
}

class Message {
    /**
     * @param {Object} msg 
     */
    constructor(msg) {
        this.msg = msg;
        this.event_type = msg["type"];
        if (this.event_type === MessageEventType.RecorderEvent) {
            this.event = new RecoderEvent(msg);
        } else {
            this.event = null;
        }
    }

    /**
     * @returns {RecoderEvent | null}
     */
    get_event() {
        return this.event;
    }

    toString() {
        return JSON.stringify(this.msg);
    }
}


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
    }
}
