import { CapabilitiesManager, selectionContexts, menuIconPaths } from "/module/capabilitiesmanager.js";
import { OptionsManager } from "/module/optionsmanager.js";
import { AttachmentManager } from "/module/attachmentmanager.js";
import { FilterManager } from "/module/filtering/filtermanager.js";
import { i18nText } from "/module/i18nText.js";

(async (document, messenger) => {

    // Initialize menu items

    const documentTitle = i18nText.extensionName;

    const { browserAction, menus, messageDisplay, messageDisplayAction, messages, runtime, tabs, windows } = messenger;

    const { create } = menus;

    const thisMessageMenuId = await create({ title: i18nText.thisMessage, contexts: ["message_list"], icons: menuIconPaths });
    const thisMessageDirectMenuId = await create({ title: `${i18nText.thisMessage} (${i18nText.direct})`, contexts: ["message_list"], icons: menuIconPaths });

    const menuItems = new Map([
        [ await create({ title: documentTitle, contexts: ["folder_pane"] }), selectionContexts.folder ],
        [ thisMessageMenuId, selectionContexts.message ],
        [ thisMessageDirectMenuId, selectionContexts.messageDirect ],
        [ await create({ title: i18nText.selectedMessages, contexts: ["message_list"], icons: menuIconPaths }), selectionContexts.selected ],
        [ await create({ title: i18nText.listedMessages, contexts: ["message_list"], icons: menuIconPaths }), selectionContexts.listed ]
    ]);

    // Initialize action buttons

    const resetBrowserAction = () => {
        browserAction.setTitle({ title: `${i18nText.about} ${i18nText.extensionName}` });
        browserAction.setBadgeBackgroundColor({ color: "#94642a" });
        browserAction.setBadgeText({ text: "?" });
    };

    const initialExtensionOptions = await OptionsManager.retrieve();

    const extensionVersion = (await browser.runtime.getManifest()).version;

    if(extensionVersion !== initialExtensionOptions.lastLoadedVersion) {
        browserAction.setTitle({ title: `${i18nText.newVersion}: ${extensionVersion}` });
        browserAction.setBadgeBackgroundColor({ color: "#31b125ff" });
        browserAction.setBadgeText({ text: "!" });
    }
    else {
        resetBrowserAction();
    }

    let messageDisplayTab = null;

    messageDisplayAction.setTitle({ title: `${i18nText.extensionName} (${i18nText.thisMessage})`});
    messageDisplayAction.setBadgeBackgroundColor({ color: "#94642a" });
    messageDisplayAction.disable();

    const configureDisplayAction = async (tab, message) => {
        messageDisplayTab = tab;

        messageDisplayAction.disable();

        let attachmentCount = 0;

        if(message) {
            const attachments = await messages.listAttachments(message.id);

            for(let attachment of attachments) {
                if(attachment.contentType != "text/x-moz-deleted") {
                    if(!(attachment.headers && (!!attachment.headers["x-mozilla-altered"] || !!attachment.headers["x-mozilla-external-attachment-url"]))) {
                        attachmentCount++;
                    }
                }
            }
        }

        if(attachmentCount == 0) {
            messageDisplayAction.setBadgeText({ tabId: tab.id, text: "" });
        }
        else {
            messageDisplayAction.setBadgeText({ tabId: tab.id, text: attachmentCount.toString() });
            if(!popupId) {
                messageDisplayAction.enable();
            }
        }
    };


    // Background extraction methods

    let params = null;

    let popupId = null;
    let releaseNotesPopupId = null;

    const handleAction = async (info, tab, selectionContext) => {
        if (!popupId) {
            let accountId = null;
            const selectedFolders = [];
            let tabId = null;
            let selectedMessages;

            if(selectionContext == selectionContexts.folder) {

                // If an account node has been selected...
                if (info.selectedAccount) {
                    accountId = info.selectedAccount.id;
                    selectedFolders.push(...info.selectedAccount.folders);
                    selectionContext = selectionContexts.account;
                }
                // If a folder node has been selected...
                else if (info.selectedFolder) {
                    accountId = info.selectedFolder.accountId;
                    selectedFolders.push(info.selectedFolder);
                }
            }
            else {
                accountId = info.displayedFolder.accountId;
                selectedFolders.push(info.displayedFolder);

                switch(selectionContext) {
                    case selectionContexts.message:
                    case selectionContexts.messageDirect:
                        selectedMessages = info.selectedMessages.messages;
                        break;

                    case selectionContexts.selected:
                        tabId = tab.id;
                        break;

                    case selectionContexts.listed:
                        if(CapabilitiesManager.useGetListedMessages) {
                            tabId = tab.id;
                        }
                        else {
                            selectionContext = selectionContexts.folder;
                        }

                        break;
                }
            }

            if (selectedFolders.length > 0) {
                const extensionOptions = await OptionsManager.retrieve();

                await OptionsManager.tagging.initializeGlobalTag();

                params = {
                    accountId: accountId,
                    tabId: tabId,
                    selectionContext: selectionContext,
                    selectedFolders: selectedFolders,
                    selectedMessages: selectedMessages,
                    allowExtractImmediate: selectionContext !== selectionContexts.account && (
                        selectionContext !== selectionContexts.folder ||
                        (extensionOptions.extractImmediate && selectedFolders.length == 1 && (selectedFolders[0].subFolders.length == 0 || extensionOptions.includeSubfolders))
                    ),
                    forceIndividualSave: (selectionContext == selectionContexts.messageDirect)
                };

                toggleMenuEnablement(false);

                if(extensionOptions.extractImmediate && extensionOptions.useSilentMode && params.allowExtractImmediate) {
                    params.showZeroAttachmentsMessage = true;

                    extractSilently(extensionOptions);
                }
                else {

                    popupId = (await browser.windows.create({
                        type: "popup",
                        url: "/ui/extractem.html",
                        allowScriptsToClose: true
                    })).id;
                }
            }
        }
    };

    const extractSilently = async(extensionOptions) => {
        const attachmentManager = new AttachmentManager({
            folders: params.selectedFolders,
            silentModeInvoked: true,

            reportProcessingComplete: (info) =>
            {
                if(info.attachmentCount > 0) {
                    attachmentManager.extract(attachmentManager.attachmentList,
                        (attachment) => ({
                            messageId: attachment.messageId,
                            partName: attachment.partName,
                            timestamp: attachment.date
                        }),
                        {
                            preserveFolderStructure: extensionOptions.preserveFolderStructure,
                            includeEmbeds: extensionOptions.includeEmbeds,
                            packageAttachments: (extensionOptions.packageAttachments && !params.forceIndividualSave),
                            tagMessages: extensionOptions.enableMessageTagging                  // Tag if enabled as .tagMessages not assignable in this context
                        }
                    );
                }
                else if(params.showZeroAttachmentsMessage) {
                    browser.windows.create({
                        type: "popup",
                        url: "/ui/prompt.html?messageKey=noAttachments",
                        allowScriptsToClose: true,
                        height: 300,
                        width: 500
                    });

                    toggleMenuEnablement(true);
                }
            },
            
            reportSaveResult: updateSaveResult,

            alwaysPromptForDownloadLocation: extensionOptions.alwaysPromptForDownloadLocation,

            useAdvancedGetRaw: CapabilitiesManager.useAdvancedGetRaw,
            useEnhancedLogging: extensionOptions.useEnhancedLogging,

            useFilenamePattern: extensionOptions.useFilenamePattern,
            filenamePattern: extensionOptions.filenamePattern,
            maxFilenameSubjectLength: extensionOptions.maxFilenameSubjectLength,

            omitDuplicates: extensionOptions.omitDuplicates,

            tagMessagesEnabled: extensionOptions.enableMessageTagging,

            useMailFolderId: CapabilitiesManager.useMailFolderId,
            useLegacyEmbedIdentification: CapabilitiesManager.useLegacyEmbedIdentification
        });

        const selectedFolderPaths = (params.selectionContext == selectionContexts.folder && extensionOptions.includeSubfolders)
            ? assembleFolderPaths(params.selectedFolders[0])
            : [params.selectedFolders[0].path];

        const fileTypeFilter = (extensionOptions.useFileTypeFilter)
            ? FilterManager.assembleFileTypeFilter(extensionOptions)
            : null

        const discoveryOptions = {
            selectedFolderPaths: new Set(selectedFolderPaths),
            includeEmbeds: extensionOptions.includeEmbeds,
            fileTypeFilter: fileTypeFilter,
            selectionContext: params.selectionContext,
            tabId: params.tabId,
            selectedMessages: params.selectedMessages
        };
    
        attachmentManager.discoverAttachments(discoveryOptions);
    };

    const assembleFolderPaths = (folder) => {
        var result = [folder.path];

        folder.subFolders.forEach((item, i) => {
            result.push(...assembleFolderPaths(item));
        });

        return result;
    };

    const updateSaveResult = (info) => {
        if(info.status != "started") {
            params = null;

            toggleMenuEnablement(true);
        }
    };

    const toggleMenuEnablement = async (enable) => {
        if(enable && messageDisplayTab) {
            const message = await messageDisplay.getDisplayedMessage(messageDisplayTab.id);

            configureDisplayAction(messageDisplayTab, message);
        }
        else {
            messageDisplayAction.disable();
        }

        for(let menuId of menuItems.keys()) {
            menus.update(menuId, { enabled: enable });
        }
    };

    // Event handlers
    
    messages.onNewMailReceived.addListener(async (folder, newMessages) => {
        const extensionOptions = await OptionsManager.retrieve();

        if(extensionOptions.extractOnReceiveEnabled) {
            folder.subFolders = [];

            params = {
                accountId: folder.accountId,
                selectionContext: selectionContexts.messageDirect,
                selectedFolders: [folder],
                tabId: null,
                selectedMessages: newMessages.messages,
                preserveFolderStructure: extensionOptions.preserveFolderStructure,
                allowExtractImmediate: true,
                forceIndividualSave: true
            };

            extractSilently(extensionOptions);
        }
    });

    runtime.onMessage.addListener((request, sender, respond) => {
        if(request && request.action) {
            switch(request.action) {
                case "getParams":
                    respond(params);
                    break;

                case "close":
                    windows.remove(popupId);
                    break;

                case "resetBrowserAction":
                    resetBrowserAction();
                    break;
            }
        }
    });

    menus.onShown.addListener(async (info, tab) => {
        if(!popupId && info.contexts.includes("message_list")) {
            if(info.selectedMessages && info.selectedMessages.messages) {
                const enabled = info.selectedMessages.messages.length == 1;

                await menus.update(thisMessageMenuId, { enabled: enabled });
                await menus.update(thisMessageDirectMenuId, { enabled: enabled });
                
                menus.refresh();
            }
        }
    });

    menus.onClicked.addListener((info, tab) => {
        if(menuItems.has(info.menuItemId)) {
            let selectionContext = menuItems.get(info.menuItemId);

            handleAction(info, tab, selectionContext);
        }
    });

    tabs.onActivated.addListener(async ({ tabId }) => {
        const tab = await tabs.get(tabId);

        if(tab.mailTab) {
            const message = await messageDisplay.getDisplayedMessage(tabId);

            configureDisplayAction(tab, message);
        }
    });

    messageDisplay.onMessageDisplayed.addListener(configureDisplayAction);

    messageDisplayAction.onClicked.addListener(async (tab, info) => {
        const message = await messageDisplay.getDisplayedMessage(tab.id);

        info.displayedFolder = message.folder;
        info.displayedFolder.subFolders = [];
        info.selectedMessages = { messages: [message] };

        handleAction(info, tab, selectionContexts.messageDirect);
    });

    browserAction.onClicked.addListener(async (tab, info) => {
        if(releaseNotesPopupId) {
            windows.update(releaseNotesPopupId, { focused: true });
        }
        else {
            releaseNotesPopupId = (await browser.windows.create({
                type: "popup",
                url: "/ui/releasenotes.html",
                allowScriptsToClose: true
            })).id;

            if(CapabilitiesManager.extensionVersion !== initialExtensionOptions.lastLoadedVersion) {
                OptionsManager.setOption("lastLoadedVersion", CapabilitiesManager.extensionVersion);
            }

            resetBrowserAction();
        }
    });

    windows.onRemoved.addListener(async (windowId) => {
        if (windowId == popupId) {
            params = null;
            popupId = null;

            toggleMenuEnablement(true);
        }

        if(windowId == releaseNotesPopupId) {
            releaseNotesPopupId = null;
        }
    });
})(document, messenger);
