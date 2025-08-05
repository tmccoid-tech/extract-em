export const api = (() =>
{
    const {
        menus, runtime,  folders, messages, mailTabs
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
        createMenu: (options) =>
            execAsync(() => menus.create(options)),

        updateMenu: (menuId, options) =>
            execAsync(() => menus.update(menuId, options)),

        getPlatformInfo: () =>
            execAsync(runtime.getPlatformInfo),

        getFolderInfo: (folderParam) =>
            execAsync(() => folders.getFolderInfo(folderParam), 10000),

        listMessages: (folderParam) =>
            execAsync(() => messages.list(folderParam), 20000),

        getSelectedMessages: (tabId) =>
            execAsync(() => mailTabs.getSelectedMessages(tabId), 20000),

        getListedMessages: (tabId) =>
            execAsync(() => mailTabs.getListedMessages(tabId), 20000),

        continueList: (pageId) =>
            execAsync(() => messages.continueList(pageId), 20000),

        listAttachments: (messageId) =>
            execAsync(() => messages.listAttachments(messageId), 10000),

        getMessage: (messageId) =>
            execAsync(() => messages.get(messageId), 10000),

        getFullMessage: (messageId) =>
            execAsync(() => messages.getFull(messageId), 10000),

        getRaw: (messageId) =>
            execAsync(() => messages.getRaw(messageId), 15000),

        getRawFile: (messageId) =>
            execAsync(() => messages.getRaw(messageId, { "data_format": "File" }), 15000),

        updateMessage: (messageId, options) => 
            execAsync(() => messages.update(messageId, options)),

        getAttachmentFile: (messageId, partName) =>
            execAsync(() => browser.messages.getAttachmentFile(messageId, partName), 15000)
    };    
})();