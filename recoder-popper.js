console.log("popping recoder ...");

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
});