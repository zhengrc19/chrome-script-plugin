console.log("start backend ...");

import RecorderHandler from './message-handler.js';
console.log("imported handler")

var handler = new RecorderHandler();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        console.log(message);
        handler.msg_callback(message, sender, sendResponse);
    } catch (err) {
        console.log(err);
        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            func: (err) => {
                let alert = "出现错误：\n" + err + "\n建议结束此次录制并重新录制。";
                window.alert(alert);
            },
            args: [err.message]
        });
    }
    return true; // sendResponse open for async
});

