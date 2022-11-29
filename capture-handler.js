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
     * @param {(Object) => void} sendResponse parameter in msg listener
     */
    constructor(tab_id, timestamp, recorder_id_date, sendResponse) {
        this.task_id = -1;
        this.tab_id = tab_id;
        this.timestamp = timestamp;
        this.id_date = recorder_id_date;
        this.sendResponse = sendResponse;

        this.status = TaskStatus.Wait;
    }

    boot()  {
        let msg = build_mask_msg(this.task_id, this.timestamp, MaskMsgType.MaskInquery);
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
 * @param {string} suffix 
 */
 function download_img(url, timestamp, id_date, suffix) {
    if (id_date == null) {
        throw "null id_date!";
    }
    
    let date_str = id_date.toISOString().replaceAll("-","_").replaceAll(":", ".");
    let img_filename = `record_${date_str}/img/${timestamp}_${suffix}.jpeg`;

    chrome.downloads.download({
        filename: img_filename,
        url: url
    }).then((downloadId) => {
        console.log("downloaded!", downloadId, img_filename);
    });
}


export class ImgCapTask extends CaptureTask {
    /**
     * @param {number} tab_id 
     * @param {number} timestamp
     * @param {Date} recorder_id_date
     * @param {(Object) => void} sendResponse parameter in msg listener
     * @param {string} suffix
     */
     constructor(tab_id, timestamp, recorder_id_date, sendResponse, suffix) {
        super(tab_id, timestamp, recorder_id_date, sendResponse);
        this.suffix = suffix;
     }

    async run() {
        await chrome.tabs.captureVisibleTab().then((data_url) => {
            download_img(data_url, this.timestamp, this.id_date, this.suffix); // DO NOT wait for download
        });
        this.status = TaskStatus.Finish;
    }
}


/**
 * @param {string} url 
 * @param {number} timestamp
 * @param {Date} id_date date of recode starting time, use as unique record id
 * @param {string} suffix 
 */
 function download_mhtml(url, timestamp, id_date) {
    if (id_date == null) {
        throw "null id_date!";
    }
    
    let date_str = id_date.toISOString().replaceAll("-","_").replaceAll(":", ".");
    let mhtml_filename = `record_${date_str}/mhtml/${timestamp}.mhtml`;

    chrome.downloads.download({
        filename: mhtml_filename,
        url: url
    }).then((downloadId) => {
        console.log("downloaded!", downloadId, mhtml_filename);
    });
}


export class MHTMLCapTask extends CaptureTask {
    /**
     * @param {number} tab_id 
     * @param {number} timestamp
     * @param {Date} recorder_id_date
     * @param {(Object) => void} sendResponse parameter in msg listener
     */
    constructor(tab_id, timestamp, recorder_id_date, sendResponse) {
        super(tab_id, timestamp, recorder_id_date, sendResponse);
    }

    async run() {
        await chrome.pageCapture.saveAsMHTML({ tabId: this.tab_id}, async (blob) => {
            const content = await blob.text();
            const url = "data:application/x-mimearchive;base64," + btoa(content);
            download_mhtml(url, this.timestamp, this.id_date, "");  // DO NOT wait for download
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
     * @param {function} sendResponse parameter in msg listener
     * @param {string} suffix
     */
    constructor(task_types, tab_id, timestamp, recorder_id_date, sendResponse, suffix) {
        super(tab_id, timestamp, recorder_id_date, sendResponse);
        this.task_list = [];
        task_types.forEach((val, id, arr) => {
            this.task_list.push(val == TaskType.Img? new ImgCapTask(tab_id, timestamp, recorder_id_date, null, suffix)
                                : new MHTMLCapTask(tab_id, timestamp, recorder_id_date, null));
        });
        console.log(this.task_list);
    }

    async run() {
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
            throw "Task is not accepted this moment!";
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
            throw `Task Id not found! id=${task_id}, queues=${this.queues}`;
        } else if(type != MaskMsgType.MaskReady) {
            throw `Illegal MaskMsg type received! type=${type}`;
        }

        let task = this.queues[task_id]; 
        let tab_id = task.tab_id;
        let self = this;

        console.assert(tab_id == msg.tab_id);
        task.run().then(() => {
            task.status = TaskStatus.Finish;
            task.send_release(sendResponse);
            delete self.queues[task_id];
            let lock = self.tab_locks[tab_id];
            lock.unlock();
        });
    }

    async clear() {
        this.accept = false;
        let self = this;
        function is_clear() {
            let task_num = Object.keys(self.queues).length;
            if(task_num == 0) {
                let tab_ids = Object.keys(self.tab_locks);
                for(let i=0;i<tab_ids.length;i++) {
                    let id = tab_ids[i];
                    if(!self.tab_locks[id].idle()) {
                        console.warn("err?");
                    }
                    self.tab_locks = [];
                }
            } 
            return task_num == 0;
        }

        while(!is_clear()) {
            await new Promise((r) => setTimeout(100));
        }
    }
}

export const task_controller = new CapTaskController();