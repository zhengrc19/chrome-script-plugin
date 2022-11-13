console.log("popping recoder ...");


/* msg buiding funcs */
const MessageEventType = {
    ContentInitEvent: 0,
    RecorderEvent: 1,
    ClickEvent: 2,
    InputEvent: 3
};

const RecoderEventType = {
    BEGIN: 1,
    END: 2
};

/**
 * get url of this webpage
 * @returns {string}
 */
function get_url() {
    return window.location.href;
}


var record_id = -1;
function get_record_id() {
    return record_id;
}

/**
 * @param {number} event_type 
 * @param {number} timestamp 
 * @param {Object} data 
 * @returns {Object}
 */
 function build_msg(event_type, timestamp, data) {
    return {
        "url": get_url(),
        "id": get_record_id(),
        "type": event_type,
        "timestamp": timestamp,
        "data": data
    };
}

/**
 * @param {number} id 
 * @param {number} timestamp 
 * @param {string} type 
 * @param {string} selector 
 * @param {number} offsetX 
 * @param {number} offsetY 
 * @param {number} pageX 
 * @param {number} pageY 
 * @returns {Object}
 */
function build_click_msg(
    timestamp, 
    type, selector, 
    offsetX, offsetY,
    pageX, pageY
) {
    let data = {
        "type": type,
        "selector": selector,
        "offsetXY": [offsetX, offsetY],
        "pageXY": [pageX, pageY]
    };
    return build_msg(MessageEventType.ClickEvent, timestamp, data);
}

/**
 * @param {number} timestamp 
 * @param {boolean} is_start
 * @returns 
 */
function build_record_msg(
    timestamp, 
    is_start
) {
    let data = {
        "type": is_start? RecoderEventType.BEGIN: RecoderEventType.END
    };
    return build_msg(MessageEventType.RecorderEvent, timestamp, data);
}

/**
 * @param {number} timestamp 
 * @param {string} selector 
 * @param {string} text 
 * @returns 
 */
function build_input_msg(
    timestamp, 
    selector, text
) {
    let data = {
        "text": text,
        "selector": selector
    };
    return build_msg(MessageEventType.InputEvent, timestamp, data);
}

function build_init_msg (
    timestamp
) {
    let data = {
        "placeholder": ""
    };
    return build_msg(MessageEventType.ContentInitEvent, timestamp, data);
}

/* Pop floating window */
var float_recoder = document.createElement("div");
float_recoder.classList.add("go-top");
float_recoder.id = "ext-recoder-window"
float_recoder.innerHTML = '<a href="#" id="ext-recoder-href">开始<br/>录制</a>';
document.body.appendChild(float_recoder);

recoder_button = float_recoder.children[0];

/* send content start msg */
var init_is_recording;
chrome.runtime.sendMessage(
    build_init_msg(get_timestamp()),
    callback = (response) => {
        console.log(response);
        init_is_recording = response["is_recording"];
        let id = response["id"];
        record_id = id;

        if (init_is_recording) {
            recoder_button.classList.add("recording");
            recoder_button.style.color = 'red';
        }
    }
);


/** global variables */
/**
 * return true if in recording process
 * @function
 * @param {}
 * @returns {boolean}
 */
function is_recording() {
    return recoder_button.classList.contains("recording");
}

var userset_scrollX = 0;
var userset_scrollY = 0;
/**
 * @function
 * @returns {array}
 */
function get_userset_scrollXY() {
    return [userset_scrollX, userset_scrollY]
}

/** func for event */
/**
 * get UNIX timestamp using data.now
 * @function
 * @param {}
 * @returns {number}
 */
function get_timestamp() {
    return Date.now().valueOf();
}

/**
 * get selector
 * TODO: simplify selector, using id or name
 * @function
 * @param {HTMLElement} el 
 * @returns {string}
 */
function get_selector(el) {
    if (el.tagName.toLowerCase() === "body") {
        return "BODY";
    }
    if (el.id) {
        return "#" + el.id;
    }

    let child_idx = 1;
    for (let e = el; e.previousElementSibling; e = e.previousElementSibling, child_idx++) ;
    return get_selector(el.parentElement) + " > " + el.tagName + ":nth-child(" + child_idx.toString() + ")";
}

/**
 * @function
 * @param {HTMLElement} el
 */
function ignore_click(el) {
    let tag = el.tagName.toLowerCase();
    if (tag == "body") {
        return true;
    }

    if (tag == "a" || tag == "input" || tag == "button") {
        return false;
    }

    if(el.getAttribute("onclick") != null || el.getAttribute("href") != null) {
        return false;
    }

    return ignore_click(el.parentElement);
}

/** Send recoder msg */
recoder_button.addEventListener("click", function(event) {
    let timestamp = get_timestamp();
    let is_start;
    if(this.classList.contains("recording")) {
        console.log("end recoding");
        is_start = false;
        this.classList.remove("recording");
        this.style.color = null;
    } else {
        console.log("start recoding");
        is_start = true;
        this.classList.add("recording");
        this.style.color = 'red';
    }

    console.log("recording action: ", timestamp, is_start);

    chrome.runtime.sendMessage(
        build_record_msg(timestamp, is_start)
    );
});

/* Listen all click event */
document.body.addEventListener("click", function(event) {
    if (!is_recording()) {  // ignoring if not recording
        return;
    }
    if (event.target.id === "ext-recoder-href" 
    || event.target.id === "ext-recoder-window") { // ignoring click on recoder
        return; 
    }

    console.log("onclick!");
    console.log(event.target);
    if (ignore_click(event.target)){  // TODO: more accurate filter
        return;
    }
    
    let timestamp = get_timestamp();
    
    console.log(timestamp);
    console.log(event.offsetX, event.offsetY);  // cursor pos relative to targeted object
    console.log(event.pageX, event.pageY);  // cursor pos relative to webpage
    console.log(event.type);  // 'click' 'submit'
    
    // get selector
    let selector = get_selector(event.target);
    console.log(selector);
    console.assert(document.querySelector(selector) == event.target); // assert selector is right

    chrome.runtime.sendMessage(
        build_click_msg(timestamp, event.type, selector, event.offsetX, event.offsetY, event.pageX, event.pageY)
    );
});


/* Listen all input change event */
var input_list = document.getElementsByTagName("input");
console.log(input_list.length);

for (let i = 0; i < input_list.length; i++) {
    let input_item = input_list[i];
    input_item.addEventListener("change", (ev) => {
        if (!is_recording()) {  // ignoring if not recording
            return;
        }

        let timestamp = get_timestamp();
        let current_text = input_item.value;
        let selector = get_selector(input_item);
        console.log("onchange!");
        console.log(current_text, timestamp);
        console.log(selector);
        console.assert(document.querySelector(selector) == ev.target);

        chrome.runtime.sendMessage(
            build_input_msg(timestamp, selector, current_text)
        );
    });
}

/* Listen scroll event */ 
window.addEventListener("scroll", (ev) => {
    if (!is_recording()) {  // ignoring if not recording
        return;
    }

    let timestamp = get_timestamp();
    let setXY = get_userset_scrollXY();
    if (window.scrollX == setXY[0] && window.scrollY == setXY[1]) {
        return;
    }
    console.log("scroll warning!");
    console.log(timestamp, window.scrollX, window.scrollY);
    window.alert("Please scroll using recoder! ");
    window.scrollTo(setXY[0], setXY[1]);
});