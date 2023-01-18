console.log("popping recoder ...");

/**
 * @param {boolean} cond 
 */
function myAssert(cond) {
    console.assert(cond);
    if(!cond) {
        throw "Assertation Error!";
    }
}

const MaskMsgType = {
    MaskInquery: 0,
    MaskReady: 1,
    MaskRelease: 2
}


/* msg buiding funcs */
const MessageEventType = {
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
        "name": user_defined_name,
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
    type, selector, bbox,
    offsetX, offsetY,
    pageX, pageY
) {
    let data = {
        "type": type,
        "bbox": bbox,
        "selector": selector,
        "offsetXY": [offsetX, offsetY],
        "pageXY": [pageX, pageY]
    };
    return build_msg(MessageEventType.ClickEvent, timestamp, data);
}

function iterate_children(
    element,
    prev_str,
    idx
) {
    let obj = new Object();
    obj.selector = get_selector(element);
    obj.rectangle = element.getBoundingClientRect();
    obj.children = [];
    for (var i = 0; i < element.children.length; i++) {
        obj.children.push(iterate_children(element.children[i], obj.level + '-', i));
    }
    return obj;
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
        "type": is_start? RecoderEventType.BEGIN: RecoderEventType.END,
    };
    return build_msg(MessageEventType.RecorderEvent, timestamp, data);
}

/**
 * @param {number} timestamp 
 * @param {Object} bbox
 * @param {string} selector 
 * @param {string} text 
 * @returns 
 */
function build_input_msg(
    timestamp, 
    bbox, selector, text
) {
    let data = {
        "text": text,
        "selector": selector,
        "bbox": bbox
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

/**
 * @param {number} task_id 
 * @param {number} timestamp 
 * @returns {Object}
 */
 function build_mask_ready_msg(task_id, timestamp) {
    let data = {
        "id": task_id,
        // "timestamp": timestamp,
        "type": MaskMsgType.MaskReady
    }
    return build_msg(MessageEventType.MaskEvent, timestamp, data);
}

/**
 * @param {str} bbox_str 
 * @param {number} timestamp 
 * @returns {Object}
 */
function build_bbox_msg(bbox_str, timestamp) {
    let data = {
        "bbox": bbox_str
    };
    return build_msg(MessageEventType.BboxEvent, timestamp, data);
}

/* Pop floating window */
var float_recoder = document.createElement("div");
float_recoder.classList.add("go-top");
float_recoder.classList.add("hidden");
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
  * mask all injected elements
  */
 function mask() {
    hide_all_windows();
    hide_element(float_recoder);
    hide_element(action_panel);
 }

 /**
  * unmask all elements
  */
function unmask() {
    console.assert(is_recording());
    unhide_element(float_recoder);
    unhide_element(action_panel);
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

var userset_scrollX = 0;
var userset_scrollY = 0;
var plugin_scroll = false;
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
 * get fall back selector
 * @param {HTMLElement} el
 * @returns {string}
 */
function get_fall_back_selector(el){
    if(el.id) {
        return "#" + el.id;
    } else {
        return el.outerHTML;
    }
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
        window.alert("出现错误：\n" + "前端发现元素" + el.toString() + "的 tag 不存在！" + "\n建议结束此次录制并重新录制。该问题若重复出现请联系相关人员。");
        throw "元素 tag 不存在：" + el.toString();
    }
    if (el.tagName.toLowerCase() === "body") {
        return "BODY";
    }
    // if (el.id) {
    //     return "#" + el.id;
    // }

    if(!el.parentElement) {
        window.alert("出现错误：\n" + "前端发现元素" + el.toString() + "的父亲不存在！" + "\n建议结束此次录制并重新录制。该问题若重复出现请联系相关人员。");
        throw "元素父亲不存在：" + el.toString();
    }

    let child_idx = 1;
    for (let e = el.previousElementSibling; e; e = e.previousElementSibling) {
        if (e.tagName == null) {
            window.alert("出现错误：\n" + "前端发现元素" + e.toString() + "的 tag 不存在！" + "\n建议结束此次录制并重新录制。该问题若重复出现请联系相关人员。");
            throw "元素 tag 不存在：" + e.toString();
        }

        if (el.tagName == e.tagName) {
            child_idx++;
        }
    }
    return get_selector(el.parentElement) + " > " + el.tagName + ":nth-of-type(" + child_idx.toString() + ")";
}

/**
 * @param {HTMLElement} el 
 * @returns {boolean}
 */
 function is_inject_el(el) {
    if (el == null) {
        return false;
    }
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


/**
 * @param {number} timestamp 
 * @param {() => void} finish_hook
 * @returns {(Object) => void}
 */
 function get_mask_callback(timestamp, finish_hook=null) {
    return async (response) => {
        /**
         * response ={
                "id": task_id,
                "timestamp": timestamp,
                "type": type
            }
         */
        console.log(response);
        let task_id = response["id"];
        let type = response["type"]
        myAssert(task_id != null);
        myAssert(response["timestamp"] == timestamp);
        myAssert(type == MaskMsgType.MaskInquery);

        mask();
        await new Promise(r => setTimeout(r, 100)); // wait a little while to make sure mask is done
        chrome.runtime.sendMessage(
            build_mask_ready_msg(task_id, timestamp),
            callback=(response) => {
                let id_in = response["id"];
                let type_in = response["type"];
                myAssert(id_in == task_id);
                myAssert(type_in == MaskMsgType.MaskRelease);
                unmask();

                if(finish_hook != null) {
                    finish_hook();
                }
            }
        )
    };
}

/**
 * @param {number} timestamp 
 */
async function download_bbox(timestamp) {
    myAssert(record_id_date != null);
    let bboxes = [];
    for (var i = 0; i < document.body.children.length; i++) {
        bboxes.push(iterate_children(document.body.children[i], '', i));
    }
    
    let bboxes_str = JSON.stringify(bboxes, null, 4);
    chrome.runtime.sendMessage(
        build_bbox_msg(bboxes_str, timestamp)
    )
}


var all_listened_els = [];
var input_tag_names = ["input", "select"];
/**
* @param {HTMLElement} el 
 */
function add_input_handler(el) {
    for(let i=0;i<input_tag_names.length;i++){
        let tagname = input_tag_names[i];
        let input_list = el.getElementsByTagName(tagname);
        for (let i = 0; i < input_list.length; i++) {
            let input_item = input_list[i];
            if(is_inject_el(input_item)) {
                continue;
            }

            if(all_listened_els.findIndex((val, id) => val === input_item) != -1) {
                continue;
            }
            console.log(input_item);
            all_listened_els.push(input_item);
            input_item.addEventListener("change", (ev) => {
                console.log("onchange!");
                if (!is_recording()) {  // ignoring if not recording
                    return;
                }
        
                let timestamp = get_timestamp();
                let current_text = input_item.value;
                let selector = get_selector(input_item);
                let bbox = ev.target.getBoundingClientRect();
                console.log("onchange!");
                console.log(current_text, timestamp);
                console.log(selector);
                // console.assert(document.querySelector(selector) == ev.target);
        
                chrome.runtime.sendMessage(
                    build_input_msg(timestamp, bbox, selector, current_text),
                    callback=get_mask_callback(timestamp, () => download_bbox(timestamp))
                );
            });
        }
    }
}

/** listen document change */
let pre_change_timestamp = -1;
function observer_handler(mutationsList, observer) {
    let timestamp = get_timestamp();
    pre_change_timestamp = pre_change_timestamp < timestamp? timestamp: pre_change_timestamp;
    for(let mutation of mutationsList) {
        if (mutation.type == 'childList') {
            mutation.addedNodes.forEach((val, index, arr) => {
                if (val instanceof HTMLElement) {
                    add_input_handler(val);
                }
            });
        }
    }
}
const observer_config = { attributes: true, childList: true, subtree: true };
const observer = new MutationObserver(observer_handler);
observer.observe(document.body, observer_config);

/**
 * @function
 * @param {HTMLElement} el
 * @param {number} timestamp
 * @returns {boolean}
 */
function ignore_click(el, timestamp) {
    if(Math.abs(timestamp - pre_change_timestamp) < 10) {
        return false;
    }

    let tag = el.tagName.toLowerCase();
    if (tag == "body") {
        return true;
    }

    if (tag == "a" || tag == "input" || tag == "button" || tag == "select") {
        return false;
    }

    if((el.getAttribute("onclick") != null && el.getAttribute("onclick") != '') 
    || (el.getAttribute("href") != null && el.getAttribute("href") != '')) {
        return false;
    }

    return ignore_click(el.parentElement, timestamp);
}

/* send content start msg */
var init_is_recording;
var init_timestamp = get_timestamp();
var record_id_date = null;

let moved = false;
let clicked = false;
let user_defined_name;
/** Send recoder msg */
recoder_button.addEventListener("mouseup", function(event) {

    clicked = false;

    if (moved){
        console.log("got into click but shouldn't!");
        moved = false;
        return;
    }

    event.preventDefault();

    let is_start;
    if(this.classList.contains("recording")) {
        console.log("end recoding");
        is_start = false;
        recoder_change(false);
    } else {
        user_defined_name = window.prompt("请输入本次录制名称：");
        if (!user_defined_name) {
            user_defined_name = '';
        }
        console.log("start recoding", user_defined_name);
        is_start = true;
        recoder_change(true);
    }

    let timestamp = get_timestamp();

    console.log("recording action: ", timestamp, is_start);

    chrome.runtime.sendMessage(
        build_record_msg(timestamp, is_start),
        callback= is_start? get_mask_callback(timestamp, () => {
            record_id_date = new Date(timestamp);
            download_bbox(timestamp);
        }): null
    );
});

recoder_button.addEventListener("mousedown", () => {
    clicked = true;
    console.log("clicked!");
});

recoder_button.addEventListener("mousemove", () => {
    // console.log(clicked);
    if (clicked) {
        moved = true;
        // console.log("moved!");
    }
});

/** capture all user input and check if an action is triggered by user */
var user_scroll = -1;
var user_click = -1;
document.addEventListener("keydown", (e) => {
    if(e.key == "PageUp"        // page up 
           || e.key == "PageDown"     // page dn 
           || e.key == " "     // spacebar
           || e.key == "ArrowUp"     // up 
           || e.key == "ArrowDown"     // down 
           || e.key == "ArrowLeft"
           || e.key == "ArrowRight"
           || (e.ctrlKey && e.key == "Home")     // ctrl + home 
           || (e.ctrlKey && e.key == "End")     // ctrl + end 
          ) { 
            let timestamp = get_timestamp();
            user_scroll = user_scroll < timestamp? timestamp: user_scroll;
    } 
}, true);

document.addEventListener("wheel", (ev) => {
    let timestamp = get_timestamp();
    user_scroll = user_scroll < timestamp? timestamp: user_scroll;
}, true);

document.addEventListener("mousedown", (ev) => {
    let timestamp = get_timestamp();
    if (ev.clientX > document.documentElement.clientWidth || ev.clientY > document.documentElement.clientHeight) {
        console.log("mouse scroll");
        user_scroll = user_scroll < timestamp? timestamp: user_scroll;
    } 
}, true);

document.addEventListener("mouseup", (ev) => {
    let timestamp = get_timestamp();
    user_click = user_click < timestamp? timestamp: user_click;
}, true);

function is_user_click(timestamp) {
    return Math.abs(timestamp - user_click) < 10;
}

function is_user_scroll(timestamp) {
    return Math.abs(timestamp - user_scroll) < 200;
}

/* Listen all click event */
document.body.addEventListener("click", function(event) {
    let timestamp = get_timestamp();
    if (!is_recording()) {  // ignoring if not recording
        return;
    }
    if (is_inject_el(event.target)) { // ignoring click on recoder
        return; 
    }
    if(!is_user_click(timestamp)) {
        return;
    }

    console.log("onclick!");
    console.log(event.target);
    if (ignore_click(event.target, timestamp)){ 
        return;
    }
    
    console.log(timestamp);
    console.log(event.offsetX, event.offsetY);  // cursor pos relative to targeted object
    console.log(event.pageX, event.pageY);  // cursor pos relative to webpage
    console.log(event.type);  // 'click' 'submit'
    
    // get selector
    let selector = get_selector(event.target);
    console.log(selector);
    console.assert(document.querySelector(selector) == event.target); // assert selector is right
    let bbox = event.target.getBoundingClientRect();

    chrome.runtime.sendMessage(
        build_click_msg(timestamp, event.type, selector, bbox, event.offsetX, event.offsetY, event.pageX, event.pageY),
        callback=get_mask_callback(timestamp, () => download_bbox(timestamp))
    );
    return;
}, true);

/* Listen all input change event */
(async() => {
    await new Promise(r => setTimeout(r, 1000));
    add_input_handler(document);
})()

/* Listen scroll event */ 
var update_allowed_scroll = async () => {
    await new Promise(r => setTimeout(r, 10)); // wait a little while to make sure scroll is done
    userset_scrollX = window.scrollX;
    userset_scrollY = window.scrollY;
    console.log("allowed scroll update", userset_scrollX, userset_scrollY);
};

window.addEventListener("scroll", (ev) => {
    let timestamp = get_timestamp();
    if(!is_user_scroll(timestamp)) {
        console.log("not user scroll");
        update_allowed_scroll();
        return;
    }
    if (!is_recording()) {  // ignoring if not recording
        update_allowed_scroll();
        return;
    }

    let setXY = get_userset_scrollXY();
    console.log(setXY, window.scrollX, window.scrollY);
    
    if(plugin_scroll) {
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
    
    if (isNaN(sx) || isNaN(sy)) {
        window.alert("请输入正整数！");
        return;
    }

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

    let max_scrollY = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    max_scrollY = max_scrollY < 0? 0: max_scrollY;
    let max_scrollX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    max_scrollX = max_scrollX < 0? 0: max_scrollX;

    console.log("scroll max:", max_scrollX, max_scrollY);
    
    let x = Math.round(max_scrollX * (sx / 100));
    let y = Math.round(max_scrollY * (sy / 100));
    userset_scrollX = x;
    userset_scrollY = y;
    console.log("scrolling to:", x, y);
    plugin_scroll = true;
    window.scrollTo(x,y);
    plugin_scroll = false;
    
    let timestamp = get_timestamp();
    await new Promise(r => setTimeout(r, 100)); // wait a little while to make sure scroll is done
    chrome.runtime.sendMessage(
        build_scroll_msg(timestamp, x, y),
        callback=get_mask_callback(timestamp, () => download_bbox(timestamp))
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
    hide_element(text_window);
});

var selection_data = null;
document.addEventListener("copy", (event) => {
    if(is_hidden(paste_window)) {
        return;
    }

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
        build_paste_msg(timestamp, selection_data),
        callback=get_mask_callback(timestamp, ()=>window.alert("提交成功！"))
    );
    
    selection_data = null;
    let el = document.getElementById("ext-paste");
    el.value = null;
});

function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "header")) {
      /* if present, the header is where you move the DIV from:*/
      document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
    } else {
      /* otherwise, move the DIV from anywhere inside the DIV:*/
      elmnt.onmousedown = dragMouseDown;
    }
  
    function dragMouseDown(e) {
      e = e || window.event;
    //   e.preventDefault();
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;
    }
  
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      // calculate the new cursor position:
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // set the element's new position:
      elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
      elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }
  
    function closeDragElement() {
      /* stop moving when mouse button is released:*/
      document.onmouseup = null;
      document.onmousemove = null;
    }
}

dragElement(document.getElementById("ext-recoder-window"));
dragElement(document.getElementById("panel"));
dragElement(document.getElementById("scroll-window"));
dragElement(document.getElementById("text-window"));
dragElement(document.getElementById("paste-window"));


// sending init here 
chrome.runtime.sendMessage(
    build_init_msg(init_timestamp),
    callback = (response) => {
        init_is_recording = response["is_recording"];
        let id = response["record_id"];
        let trans_type = response["transition"];
        let _date = response["record_timestamp"];  // may be null

        myAssert(id != null);
        myAssert(init_is_recording != null);
        myAssert(trans_type != null);
        console.log(init_is_recording, id, trans_type);
        console.log(response);
        
        record_id = id;

        // mask loading 
        let load = document.getElementById("ext-plugin-loading");
        if (load != null) {
            document.documentElement.removeChild(load);
        }

        if(init_is_recording) {
            if(trans_type == "forbidden") {
                window.alert("禁止通过网址输入进行跳转，请关闭此页面以继续录制！");
                return;
            } else if(trans_type == "ignore") {
                return;
            }

            recoder_change(init_is_recording); 
            record_id_date = new Date(_date);

            get_mask_callback(init_timestamp, 
                () => { 
                    download_bbox(init_timestamp);
                }
            )(response);
        } else {
            if(trans_type != "ignore") {
                unhide_element(float_recoder);
            }
        }
    }
);