import "./jszip.js";

export const zip = new JSZip();
export const folder_bbox = zip.folder("bbox");
export const folder_log = zip.folder("log");
export const folder_img = zip.folder("img");
export const folder_mhtml = zip.folder("mhtml");

const TaskStatus = {
    Wait: 0,
    Running: 1,
    Finish: 2,
    Err: -1
}

export const MaskMsgType = {
    MaskInquery: 0,
    MaskReady: 1,
    MaskRelease: 2
}

export const TaskType = {
    Img: 1,
    MHTML: 2
}

/**
 * @param {number} task_id 
 * @param {number} timestamp 
 * @param {number} type in TaskStatus
 * @returns {Object}
 */
function build_mask_msg(task_id, timestamp, type) {
    return {
        "id": task_id,
        "timestamp": timestamp,
        "type": type
    }
}


class CaptureTask {
    /**
     * @param {number} tab_id 
     * @param {number} timestamp
     * @param {Date} recorder_id_date
     * @param {string} event_name user given name of record event
     * @param {(Object) => void} sendResponse parameter in msg listener
     */
    constructor(tab_id, timestamp, recorder_id_date, event_name, sendResponse) {
        this.task_id = -1;
        this.tab_id = tab_id;
        this.timestamp = timestamp;
        this.event_name = event_name;
        this.id_date = recorder_id_date;
        this.sendResponse = sendResponse;

        this.status = TaskStatus.Wait;
        this.boot_info = null;
    }

    /**
     * @param {Object} msg 
     */
    set_boot_info(msg) {
        this.boot_info = msg;
    }

    boot()  {
        let msg = build_mask_msg(this.task_id, this.timestamp, MaskMsgType.MaskInquery);
        msg = this.boot_info == null? msg :{
            ...msg,
            ...this.boot_info
        }
        console.log(msg);
        this.sendResponse(msg);
    }

    async run() {
        this.status = TaskStatus.Err;
        console.warn("Not Implemented!");
    }
    
    /**
     * @param {(Object) => void} sendResponse parameter in msg listener
     */
    send_release(sendResponse) {
        let msg = build_mask_msg(this.task_id, this.timestamp, MaskMsgType.MaskRelease);
        sendResponse(msg);
    }
}


/**
 * 
 * @param {string} url 
 * @param {number} timestamp
 * @param {Date} id_date date of recode starting time, use as unique record id
 * @param {string} event_name user given name of record event
 * @param {string} suffix 
 */
 function download_img(url, timestamp, id_date, event_name, suffix) {
    if (id_date == null) {
        throw new Error("null id_date!");
    }
    
    let date_str = id_date.toISOString().replaceAll("-","_").replaceAll(":", ".");
    let img_filename = `record_${event_name}_${date_str}/img/${timestamp}_${suffix}.jpeg`;

    // chrome.downloads.download({
    //     filename: img_filename,
    //     url: url
    // }).then((downloadId) => {
    //     console.log("downloaded!", downloadId, img_filename, url);
    // });

    folder_img.file(`${timestamp}_${suffix}.jpeg`, url.slice(23), {base64: true});
}


export class ImgCapTask extends CaptureTask {
    /**
     * @param {number} tab_id 
     * @param {number} timestamp
     * @param {Date} recorder_id_date
     * @param {string} event_name
     * @param {(Object) => void} sendResponse parameter in msg listener
     * @param {string} suffix
     */
     constructor(tab_id, timestamp, recorder_id_date, event_name, sendResponse, suffix) {
        super(tab_id, timestamp, recorder_id_date, event_name, sendResponse);
        this.suffix = suffix;
     }

    async run() {
        this.status = TaskStatus.Running;
        await chrome.tabs.captureVisibleTab().then((data_url) => {
            download_img(data_url, this.timestamp, this.id_date, this.event_name, this.suffix); // DO NOT wait for download
        });
        this.status = TaskStatus.Finish;
    }
}


/**
 * @param {string} mhtml_content 
 * @param {number} timestamp
 * @param {Date} id_date date of recode starting time, use as unique record id
 * @param {string} event_name user given name of record event
 */
 function download_mhtml(mhtml_content, timestamp, id_date, event_name) {
    if (id_date == null) {
        throw new Error("null id_date!");
    }
    
    let date_str = id_date.toISOString().replaceAll("-","_").replaceAll(":", ".");
    let mhtml_filename = `record_${event_name}_${date_str}/mhtml/${timestamp}.mhtml`;

    // chrome.downloads.download({
    //     filename: mhtml_filename,
    //     url: url
    // }).then((downloadId) => {
    //     console.log("downloaded!", downloadId, mhtml_filename, url);
    // });
    folder_mhtml.file(`${timestamp}.mhtml`, mhtml_content);
}


export class MHTMLCapTask extends CaptureTask {
    /**
     * @param {number} tab_id 
     * @param {number} timestamp
     * @param {Date} recorder_id_date
     * @param {string} event_name user given name of record event
     * @param {(Object) => void} sendResponse parameter in msg listener
     */
    constructor(tab_id, timestamp, recorder_id_date, event_name, sendResponse) {
        super(tab_id, timestamp, recorder_id_date, event_name, sendResponse);
    }

    async run() {
        this.status = TaskStatus.Running;
        await chrome.pageCapture.saveAsMHTML({ tabId: this.tab_id}, async (blob) => {
            const content = await blob.text();
            // console.log(content);
            // const url = "data:application/x-mimearchive;base64," + btoa(content);
            download_mhtml(content, this.timestamp, this.id_date, this.event_name);  // DO NOT wait for download
        });
        this.status = TaskStatus.Finish;
    }
}

export class CapTaskList extends CaptureTask {
    /**
     * @param {Array} task_types
     * @param {number} tab_id 
     * @param {number} timestamp
     * @param {Date} recorder_id_date
     * @param {string} event_name user given name of record event
     * @param {function} sendResponse parameter in msg listener
     * @param {string} suffix
     */
    constructor(task_types, tab_id, timestamp, recorder_id_date, event_name, sendResponse, suffix) {
        super(tab_id, timestamp, recorder_id_date, event_name, sendResponse);
        this.task_list = [];
        task_types.forEach((val, id, arr) => {
            this.task_list.push(val == TaskType.Img? new ImgCapTask(tab_id, timestamp, recorder_id_date, event_name, null, suffix)
                                : new MHTMLCapTask(tab_id, timestamp, recorder_id_date, event_name, null));
        });
    }

    async run() {
        this.status = TaskStatus.Running;
        let promises = [];
        this.task_list.forEach((val, id, number) => {
            promises.push(val.run());
        });
        for(let i=0;i<promises.length;i++) {
            await promises[i];
        }
        this.status = TaskStatus.Finish;
    }
}


class PluginLock {
    /**
     * @param {(Object) => void} invoke_thread 
     */
    constructor(invoke_thread) {
        this.is_locked = false;
        this.wait_queue = [];
        this.invoke_thread = invoke_thread;
    }

    /**
     * @param {Object} thread 
     */
    lock(thread) {
        if(this.is_locked) { // already locked
            console.log("is locked");
            this.wait_queue.push(thread);
        } else {
            this.is_locked = true;
            this.invoke_thread(thread);
        }
    }

    unlock() {
        console.assert(this.is_locked);
        if(this.wait_queue.length > 0) {
            let thread = this.wait_queue.shift();
            this.invoke_thread(thread);
        } else {
            this.is_locked = false;
        }
    }

    idle() {
        if(!this.is_locked) {
            console.assert(this.wait_queue.length == 0);
        }
        return !this.is_locked;
    }
}


class CapTaskController {
    constructor() {
        this.nxt_task_id = 0;
        this.accept = false;

        /**
         * queues = {
         *  task_id: CaptureTask,
         *  ...
         * },
         * 
         * tab_locks = {
         *  tab_id: bool
         * }
         */
        this.queues = {} 
        this.tab_locks = {}
    }

    start() {
        this.accept = true;
    }

    /**
     * @param {CaptureTask} task 
     */
    push(task) {
        if (!this.accept) {
            throw new Error("Task is not accepted this moment!");
        }

        let tab_id = task.tab_id;
        if (tab_id in this.tab_locks) {
            this.tab_locks[tab_id].lock(task);
        } else {
            let self = this;
            let lock = new PluginLock((task) => self.invoke_task(task));
            this.tab_locks[tab_id] = lock;
            lock.lock(task);
        }
    }

    /**
     * @param {CaptureTask} task 
     */
    invoke_task(task) {
        task.task_id = this.nxt_task_id;
        this.nxt_task_id ++;
        this.queues[task.task_id] = task;
        console.log("boot task: ", task);
        task.boot();

        let self = this;
        setTimeout(() => {
            if (task.status == TaskStatus.Wait) {
                let lock = self.tab_locks[task.tab_id];
                if(lock.is_locked) {
                    lock.unlock();
                }

                chrome.scripting.executeScript({
                    target: { tabId: task.tab_id },
                    func: () => {
                        let alert = "有截图任务超时！\n" + "如您刚刚进行了页面跳转，可以检查截图情况无误后，选择忽略此消息\n"+  "其他情况建议结束此次录制并重新录制。";
                        window.alert(alert);
                    }
                });
            }
        }, 1000);
    }

    /**
     * @param {Message} msg 
     */
    mask_msg_handler(msg, sendResponse) {
        let task_id = msg.event.task_id;
        let type = msg.event.type;
        console.assert(task_id != null);
        console.assert(type != null);

        if(!(task_id in this.queues)) {
            throw new Error(`Task Id not found! id=${task_id}, queues=${this.queues}`);
        } else if(type != MaskMsgType.MaskReady) {
            throw new Error(`Illegal MaskMsg type received! type=${type}`);
        }

        let task = this.queues[task_id]; 
        let tab_id = task.tab_id;
        let self = this;

        console.assert(tab_id == msg.tab_id);
        let lock = self.tab_locks[tab_id];

        task.run().then(() => {
            task.status = TaskStatus.Finish;
            task.send_release(sendResponse);
            delete self.queues[task_id];
            lock.unlock();
        }).catch((err) => {
            if (lock.is_locked) {
                lock.unlock();
            }
            console.log("in promise: ", err);
            let tab_id = task.tab_id;

            chrome.scripting.executeScript({
                target: { tabId: tab_id },
                func: (err) => {
                    console.log(err);
                    let alert = "操作速度过快！\n" + err + "\n建议结束此次录制并重新录制。";
                    window.alert(alert);
                },
                args: [err.message]
            });
        });
    }

    async clear() {
        this.accept = false;
        this.queues = {};
        this.tab_locks = {};
    }
}

export const task_controller = new CapTaskController();