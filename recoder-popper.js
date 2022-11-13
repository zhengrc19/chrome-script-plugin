console.log("popping recoder ...");


/* msg buiding funcs */
const MessageEventType = {
    RecorderEvent: 1,
    ClickEvent: 2,
    InputEvent: 3
};

const RecoderEventType = {
    BEGIN: 1,
    END: 2
};


/**
 * 
 * @param {string} url 
 * @param {number} id 
 * @param {number} event_type 
 * @param {number} timestamp 
 * @param {Object} data 
 * @returns {Object}
 */
 function build_msg(url, id, event_type, timestamp, data) {
    return {
        "url": url,
        "id": id,
        "type": event_type,
        "timestamp": timestamp,
        "data": data
    };
}

/**
 * 
 * @param {string} url 
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
    url, id, timestamp, 
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
    return build_msg(url, id, MessageEventType.ClickEvent, timestamp, data);
}

/**
 * 
 * @param {string} url 
 * @param {number} id 
 * @param {number} timestamp 
 * @param {boolean} is_start
 * @returns 
 */
function build_record_msg(
    url, id, timestamp, 
    is_start
) {
    let data = {
        "type": is_start? RecoderEventType.BEGIN: RecoderEventType.END
    };
    return build_msg(url, id, MessageEventType.RecorderEvent, timestamp, data);
}

/**
 * 
 * @param {string} url 
 * @param {number} id 
 * @param {number} timestamp 
 * @param {string} selector 
 * @param {string} text 
 * @returns 
 */
function build_input_msg(
    url, id, timestamp, 
    selector, text
) {
    let data = {
        "text": text,
        "selector": selector
    };
    return build_msg(url, id, MessageEventType.InputEvent, timestamp, data);
}


/* Pop floating window */
var float_recoder = document.createElement("div");
float_recoder.classList.add("go-top");
float_recoder.id = "ext-recoder-window"
float_recoder.innerHTML = '<a href="#" id="ext-recoder-href">开始<br/>录制</a>';
document.body.appendChild(float_recoder);

recoder_button = float_recoder.children[0];

/**
 * return true if in recording process
 * @function
 * @param {}
 * @returns {boolean}
 */
function is_recording() {
    return recoder_button.classList.contains("recording");
}

/**
 * get UNIX timestamp using data.now
 * @function
 * @param {}
 * @returns {number}
 */
function get_timestamp() {
    return Date.now().valueOf();
}

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

    // TODO: send mes to backend
    console.log("recording action: ", timestamp, is_start);

    chrome.runtime.sendMessage(
        build_record_msg("", -1, timestamp, is_start)
    );
});

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


/* Listen all click event */
document.body.addEventListener("click", function(event) {
    if (!is_recording()) {  // ignoring if not recording
        return;
    }
    if (event.target.id === "ext-recoder-href" 
    || event.target.id === "ext-recoder-window") { // ignoring click on recoder
        return; 
    }
    
    let timestamp = get_timestamp();
    console.log("onclick!");
    console.log(event.target);
    console.log(timestamp);
    console.log(event.offsetX, event.offsetY);  // cursor pos relative to targeted object
    console.log(event.pageX, event.pageY);  // cursor pos relative to webpage
    console.log(event.type);  // 'click' 'submit'

    // TODO: filter useless click

    // get selector
    let selector = get_selector(event.target);
    console.log(selector);
    console.assert(document.querySelector(selector) == event.target); // assert selector is right

    chrome.runtime.sendMessage(
        build_click_msg("", -1, timestamp, event.type, selector, event.offsetX, event.offsetY, event.pageX, event.pageY)
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
            build_input_msg("", -1, timestamp, selector, current_text)
        );
    });
}