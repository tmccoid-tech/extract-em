export const api = (() =>
{
    const {
       messages, mailTabs
    } = messenger;

    // Sets a timeout for async API functions which may not return in a timely fashion
    const execAsync = (execute, timeout = 5000) => {
        let timer;

        const result = Promise.race([
            execute(),
            new Promise((_, abandon) => { timer = setTimeout(
                () => abandon(`Operation abondoned after ${timeout} ms.`),
                timeout
            ); })
        ])
        .catch((error) => { throw new Error(error); })
        .finally(() => clearTimeout(timer));

        return result;
    };

    return {

        // Message listing

        getFolderMessages: (folderParam) =>
            execAsync(() => messages.list(folderParam), 20000),

        getSelectedMessages: (tabId) =>
            execAsync(() => mailTabs.getSelectedMessages(tabId), 20000),

        getListedMessages: (tabId) =>
            execAsync(() => mailTabs.getListedMessages(tabId), 20000),

        continueList: (pageId) =>
            execAsync(() => messages.continueList(pageId), 20000),

        // Individual message operations

        getMessage: (messageId) =>
            execAsync(() => messages.get(messageId), 10000),

        getFullMessage: (messageId) =>
            execAsync(() => messages.getFull(messageId), 10000),

        getRawMessage: (messageId) =>
            execAsync(() => messages.getRaw(messageId), 15000),

        getRawMessageFile: (messageId) =>
            execAsync(() => messages.getRaw(messageId, { "data_format": "File" }), 15000),

        updateMessage: (messageId, options) => 
            execAsync(() => messages.update(messageId, options)),

        // Attachment operations

        listAttachments: (messageId) =>
            execAsync(() => messages.listAttachments(messageId), 10000),

        getAttachmentFile: (messageId, partName) =>
            execAsync(() => browser.messages.getAttachmentFile(messageId, partName), 15000)
        
    };    
})();