console.log("popping recoder ...");

// Pop floating window
var float_recoder = document.createElement("div");
float_recoder.classList.add("go-top");
float_recoder.innerHTML = '<a href="#">开始<br/>录制</a>';
document.body.appendChild(float_recoder);

recoder_button = float_recoder.children[0];
recoder_button.addEventListener("click", function(event) {
    let timestamp = Date.now().valueOf();
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
})