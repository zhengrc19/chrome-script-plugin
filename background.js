console.log("start backend ...");

import RecorderHandler from './message-handler.js';
console.log("imported handler")

var handler = new RecorderHandler();

chrome.runtime.onMessage.addListener((message, callback) => {
    console.log(message);
    handler.msg_callback(message);
});

