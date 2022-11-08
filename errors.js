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

export class MessageParseErr extends PluginError {
    /**
     * @param {string} parse_err_type
     * @param {string} details
     * @param {Object} part
     * @param {Object} orig_msg
     */
    constructor(parse_err_type, details, part, orig_msg) {
        super("MsgParseErr", `${parse_err_type}: ${details}, examing part=${JSON.stringify(part)} in msg=${JSON.stringify(orig_msg)}`);
        this.parse_err_type = parse_err_type;
        this.details = details;
        this.part = part;
        this.orig_msg = orig_msg;
    }
}

export class FieldMissingErr extends MessageParseErr {
    /**
     * @function constructor
     * @param {string} field_name
     * @param {Object} part
     * @param {Object} orig_msg
     */
    constructor(field_name, part, orig_msg) {
        super("Missing Field", 
            `field_name="${field_name}"`, part, orig_msg);
        this.field_name = field_name;
    }
}

export class IllegalFieldTypeErr extends MessageParseErr {
    static Type = {
        ENUM: 1,
        ARRLEN: 2,
        OTHER: 0
    };

    /**
     * @function constructor
     * @param {number} type
     * @param {string} field_name
     * @param {string | null} require_type
     * @param {Array | null} enum_list 
     * @param {number | null} arr_len 
     * @param {Object} part
     * @param {Object} orig_msg
     */
    constructor(type, field_name, require_type, enum_list, arr_len, part, orig_msg) {
        this.found_val = part[field_name];
        this.found_type = typeof(this.found_val);
        this.field_name = field_name; 
        this.require_type = require_type;
        this.enum_list = enum_list;
        this.required_arr_len = arr_len;


        if (type === IllegalFieldTypeErr.Type.OTHER) {
            super("Illegal Field", 
                `field_name="${field_name}, require a val in list ${enum_list}, get ${this.found_val}"`, part, orig_msg);
        } else if (type === IllegalFieldTypeErr.Type.ENUM) {
            super("Illegal Field",
                `field_name="${field_name}", require ${require_type}, get ${this.found_type}`, part, orig_msg);
        } else if (type === IllegalFieldTypeErr.Type.ARRLEN) {
            super("Illegal Field", 
                `field_name="${field_name}, require arr_len=${arr_len}, get arr_len=${this.found_val.length()}"`, part, orig_msg);
        } else {
            throw `illegal type specified: ${type}`
        }
    }
}
