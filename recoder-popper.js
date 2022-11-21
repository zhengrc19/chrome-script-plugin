console.log("popping recoder ...");


/* msg buiding funcs */
const MessageEventType = {
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

/**
 * @param {number} timestamp 
 * @returns 
 */
function build_init_msg (
    timestamp
) {
    let data = {
        "placeholder": ""
    };
    return build_msg(MessageEventType.ContentInitEvent, timestamp, data);
}

/**
 * @param {number} timestamp 
 * @param {number} scrollX 
 * @param {number} scrollY 
 * @returns 
 */
function build_scroll_msg (
    timestamp, 
    scrollX, scrollY
) {
    let data = {
        "scrollXY": [scrollX, scrollY]
    };
    return build_msg(MessageEventType.ScrollEvent, timestamp, data);
}

/**
 * @param {number} timestamp 
 * @param {string} abstract 
 * @returns 
 */
function build_abstract_msg(
    timestamp, 
    abstract
) {
    let data = {
        "abstract": abstract
    };
    return build_msg(MessageEventType.AbstractEvent, timestamp, data);
}

/**
 * @param {number} timestamp 
 * @param {object} data 
 * @returns 
 */
function build_paste_msg(
    timestamp,
    data
) {
    return build_msg(MessageEventType.PasteEvent, timestamp, data);
}

/* Pop floating window */
var float_recoder = document.createElement("div");
float_recoder.classList.add("go-top");
float_recoder.id = "ext-recoder-window"
float_recoder.innerHTML = '<a href="#" id="ext-recoder-href" role="button">开始<br/>录制</a>';
document.body.appendChild(float_recoder);

recoder_button = float_recoder.children[0];

var action_panel = document.createElement("div");
action_panel.classList.add("go-top");
action_panel.classList.add("dropup");
action_panel.classList.add("hidden");
action_panel.id = "panel";
var pop_button = document.createElement("button");
pop_button.classList.add(["btn", "btn-default", "dropdown-toggle"]);
pop_button.setAttribute("data-toggle","dropdown");
pop_button.setAttribute("aria-haspopup", "true");
pop_button.setAttribute("aria-expanded", "false");
pop_button.innerHTML = '<span class="caret"></span>';
var dropdown_scroll = document.createElement("li");
dropdown_scroll.innerHTML = '<a href="#">滚动</a>';
var dropdown_text = document.createElement("li");
dropdown_text.innerHTML = '<a herf="#">摘要</a>';
var dropdown_paste = document.createElement("li");
dropdown_paste.innerHTML = '<a herf="#">框选</a>';

var dropdown_actions = document.createElement("ul");
dropdown_actions.appendChild(dropdown_scroll);
dropdown_actions.appendChild(dropdown_text);
dropdown_actions.appendChild(dropdown_paste);
dropdown_actions.classList.add("dropdown-menu");

action_panel.appendChild(pop_button);
action_panel.appendChild(dropdown_actions);
document.body.appendChild(action_panel);

var scroll_window = document.createElement("div");
scroll_window.classList.add("go-top");
scroll_window.classList.add("window");
scroll_window.classList.add("hidden");
scroll_window.id = "scroll-window";
scroll_window.innerHTML = '<p>请输入正整数百分比 (0-100) :</p> \
<form  class="form-inline" role="form"> \
    <div class="form-group" style="margin-right: 5px;"> \
        <label for="scroll_x">x: </label> \
        <input type="text" id="scroll_x" name="scroll_x"  class="form-control" required> \
    </div> \
    <div class="form-group" style="margin-right: 5px;"> \
        <label for="scroll_y">y: </label> \
        <input type="text" id="scroll_y" name="scroll_y"  class="form-control" required> \
    </div> \
    <div class="form-group"> \
      <button type="submit" class="btn btn-default">确定</button> \
    </div> \
</form>'

var text_window = document.createElement("div");
text_window.classList.add("go-top");
text_window.classList.add("window");
text_window.classList.add("hidden");
text_window.id = "text-window";
text_window.innerHTML = ' \
<form role="form"> \
    <div class="form-group" style="margin-right: 5px;"> \
        <label for="ext-abstract">请输入摘要内容: </label> \
        <textarea class="form-control" rows="3" id="ext-abstract"></textarea> \
    </div> \
    <div class="form-group"> \
      <button type="submit" class="btn btn-default">确定</button> \
    </div> \
</form>'

var paste_window = document.createElement("div");
paste_window.classList.add("go-top");
paste_window.classList.add("window");
paste_window.classList.add("hidden");
paste_window.id = "paste-window";
paste_window.innerHTML = ' <p>请复制想要的内容，点击复制后，复制的内容会自动显示在输入框中，检查无误后点击确定进行提交。</p>\
<form role="form"> \
    <div class="form-group" style="margin-right: 5px;"> \
        <label for="ext-paste"></label> \
        <textarea class="form-control" rows="3" id="ext-paste"></textarea> \
    </div> \
    <div class="form-group"> \
      <button type="submit" class="btn btn-default">确定</button> \
    </div> \
</form>'

document.body.appendChild(scroll_window);
document.body.appendChild(text_window);
document.body.appendChild(paste_window);

var scroll_form = scroll_window.children[1];
var text_form = text_window.children[0];
var paste_form = paste_window.children[1];
var all_windows = [scroll_window, text_window, paste_window];


/**
 * @param {HTMLElement} el 
 * @returns {boolean}
 */
function is_hidden(el) {
    return el.classList.contains("hidden");
}

/**
 * @param {HTMLElement} el 
 */
function hide_element(el) {
    if(!is_hidden(el)) {
        el.classList.add("hidden");
    }
}
/**
 * @param {HTMLElement} el 
 */
 function unhide_element(el) {
    if(is_hidden(el)) {
        el.classList.remove("hidden");
    }
 }

 /**
  * hide all windows pop for action
  */
 function hide_all_windows() {
    for(let i=0;i<all_windows.length;i++) {
        hide_element(all_windows[i]);
    }
 }


/**
 * @param {boolean} is_recording 
 */
function recoder_change(is_recording) {
    if(is_recording) {
        recoder_button.innerHTML = "结束<br/>录制";
        recoder_button.classList.add("recording");
        recoder_button.style.color = 'red';
        unhide_element(action_panel);
    } else {
        recoder_button.innerHTML = "开始<br/>录制";
        recoder_button.classList.remove("recording");
        recoder_button.style.color = null;
        hide_all_windows();
        hide_element(action_panel);
    }
}

dropdown_scroll.addEventListener("click", (event) => {
    event.preventDefault();
    unhide_element(scroll_window);
});

dropdown_text.addEventListener("click", (event) => {
    event.preventDefault();
    unhide_element(text_window);
});

dropdown_paste.addEventListener("click", (event) => {
    event.preventDefault();
    unhide_element(paste_window);
});

pop_button.addEventListener("click", (event) => {
    event.preventDefault();
    if(!pop_button.parentElement.classList.contains("open")) {
        hide_all_windows();
    }
});

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
            recoder_change(init_is_recording);
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
    if (el.tagName == null) {
        return get_selector(el.parentElement);
    }
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

/**
 * @param {HTMLElement} el 
 * @returns {boolean}
 */
function is_inject_el(el) {
    if(el.tagName.toLowerCase() == "body") {
        return false;
    }

    if(el === float_recoder || el === action_panel) {
        return true;
    }

    for(let i=0;i<all_windows.length;i++) { 
        if (el === all_windows[i]) {
            return true;
        }
    }

    return is_inject_el(el.parentElement);
}


/** Send recoder msg */
recoder_button.addEventListener("click", function(event) {
    event.preventDefault();

    let timestamp = get_timestamp();
    let is_start;
    if(this.classList.contains("recording")) {
        console.log("end recoding");
        is_start = false;
        recoder_change(false);
    } else {
        console.log("start recoding");
        is_start = true;
        recoder_change(true);
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
    if (is_inject_el(event.target)) { // ignoring click on recoder
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
    if(is_inject_el(input_item)) {
        continue;
    }
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
    console.log(setXY, window.scrollX, window.scrollY);
    
    if (window.scrollX == setXY[0] && window.scrollY == setXY[1]) {
        return;
    }
    console.log("scroll warning!");
    console.log(timestamp, window.scrollX, window.scrollY);
    window.alert("Please scroll using recoder! ");
    window.scrollTo(setXY[0], setXY[1]);
});

scroll_form.addEventListener("submit", async (event) => {
    event.preventDefault();

    let sx = document.getElementById("scroll_x").value;
    let sy = document.getElementById("scroll_y").value;

    sx = parseInt(sx);
    sy = parseInt(sy);

    if(sx == NaN || sy == NaN) {
        window.alert("请输入正整数！");
        return;
    }
    if(sx < 0 || sx > 100 || sy < 0 || sy > 100) {
        window.alert("请输入 0 到 100 内的整数！");
        return;
    }

    let max_scrollY = document.body.scrollHeight - document.documentElement.clientHeight;
    max_scrollY = max_scrollY < 0? 0: max_scrollY;
    let max_scrollX = document.body.scrollWidth - document.documentElement.clientWidth;
    max_scrollX = max_scrollX < 0? 0: max_scrollX;

    let x = Math.round(max_scrollX * (sx / 100));
    let y = Math.round(max_scrollY * (sy / 100));
    userset_scrollX = x;
    userset_scrollY = y;
    window.scrollTo(x,y);

    let timestamp = get_timestamp();
    await new Promise(r => setTimeout(r, 100)); // wait a little while to make sure scroll is done
    chrome.runtime.sendMessage(
        build_scroll_msg(timestamp, x, y)
    );    
});

text_form.addEventListener("submit", (event) => {
    event.preventDefault();

    let el = document.getElementById("ext-abstract");
    let abstract = el.value;
    console.log(abstract);

    if (abstract.length == 0) {
        window.alert("摘要不能为空！");
        return;
    }

    let timestamp = get_timestamp();
    chrome.runtime.sendMessage(
        build_abstract_msg(timestamp, abstract)
    );

    window.alert("提交成功！");
    el.value = null;
});

var selection_data = null;
document.addEventListener("copy", (event) => {
    let selection = document.getSelection();
    let st_node = selection.anchorNode, ed_node = selection.focusNode;
    let st_offset = selection.anchorOffset, ed_offset = selection.focusOffset;
    let st_selector = get_selector(st_node), ed_selector = get_selector(ed_node);
    let text = selection.toString();

    selection_data = {
        "st_node": {
            "selector": st_selector,
            "offset": st_offset
        },
        "ed_node": {
            "selector": ed_selector,
            "offset": ed_offset
        },
        "text": text
    };

    let el = document.getElementById("ext-paste");
    el.value = text;
});

paste_form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (selection_data == null) {
        window.alert("框选内容不能为空！");
        return;
    }

    console.log(selection_data);

    let timestamp = get_timestamp();
    chrome.runtime.sendMessage(
        build_paste_msg(timestamp, selection_data)
    );

    window.alert("提交成功！");
    selection_data = null;
    let el = document.getElementById("ext-paste");
    el.value = null;
});