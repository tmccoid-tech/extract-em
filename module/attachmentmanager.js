import { ZipEm } from "/module/zipem.js";
import { EmbedManager } from "/module/embedmanager.js";
import { SaveManager } from "/module/savemanager.js";
import { i18nText } from "/module/i18nText.js";
import { OptionsManager } from "/module/optionsmanager.js";

export class AttachmentManager {
    #platformOs;

    #folders;

    #folderCount = 0;
    #processedFolderCount = 0;
    #processedMessageCount = 0;
    #attachmentMessageCount = 0;
    #attachmentCount = 0;
    #cumulativeAttachmentSize = 0;
    #embedCount = 0;

    #selectedFolderPaths;
    #folderCounts;              // Do not reset

    #silentModeInvoked = false;
    #alwaysPromptForDownloadLocation = true;
    #includeEmbeds = false;
    #useAdvancedGetRaw = true;
    #useEnhancedLogging = false;

    #useFilenamePattern = false;
    #filenamePattern = "";
    #maxFilenameSubjectLength = 200;

    #omitDuplicates = true;

    #tagMessagesEnabled = false;
    #tagMessages = false;

    #useMailFolderId = false;

    #fileTypeFilter = null;

    messageList = new Map();
    attachmentList = [];

    #groupingSet = new Map();

    #reportFolderProcessing = async (info) => {};
    #reportMessageStats = async (folderStats) => {};
    #reportAttachmentStats = async (folderStats) => {};
    #reportFolderProcessed = async (folderPath) => {};
    #reportProcessingComplete = async () => {};

    #reportStorageProgress = async (info) => {};
    #reportSaveResult = async (info) => {};

    #reportDetachProgress = async (info) => {};
    #reportDetachResult = async (info) => {};

    #alterationTracker;
    #packagingTracker;
    
    #duplicateFileTracker;
    #sequentialFilenameTracker; 

    #duplicateEmbedFileTracker;
    #sequentialEmbedFilenameTracker;
    
    #packagingErrorList;
    #packagingFilenameList;

    #detachmentErrorList;

    #previewSet = new Set([
        "apng",
        "avif",
        "gif",
        "jpg",
        "jpeg",
        "jfif",
        "pjpeg",
        "pjp",
        "png",
        "svg",
        "webp",

        "bmp",
        "ico",
        "cur",
        "tif",
        "tiff"
    ]);

    #windowsForbiddenFileNameSet = new Set([
        "CON", "PRN", "AUX", "NUL", 
        "COM0", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
        "COM¹", "COM²", "COM³",        
        "LPT0", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
        "LPT¹", "LPT²", "LPT³"
    ]);

// < > : " / \ | ? *


//    #windowsForbiddenCharacterRegex = /[<>:"|?*\/\\]/g;
//    #charsetRegex = /charset=[\"']?(?<charset>[A-Za-z0-9\-_:]+)/g;
//    #authorRegex = /((?<author>[\w\s]*)(\<))?\s*(?<sender>[\w\-\.]+@([\w-]+\.)+[\w-]{2,})\s*(\>)?/gi

    constructor(options) {
        this.#folders = options.folders;

        this.#silentModeInvoked = options.silentModeInvoked;

        if(!options.silentModeInvoked) {
            this.#reportFolderProcessing = options.reportFolderProcessing;
            this.#reportMessageStats = options.reportMessageStats;
            this.#reportAttachmentStats = options.reportAttachmentStats;
            this.#reportFolderProcessed = options.reportFolderProcessed;

            this.#reportStorageProgress = options.reportStorageProgress;

            this.#reportDetachProgress = options.reportDetachProgress;
            this.#reportDetachResult = options.reportDetachResult;
        }

        this.#reportProcessingComplete = options.reportProcessingComplete;
        this.#reportSaveResult = options.reportSaveResult;

        this.#alwaysPromptForDownloadLocation = options.alwaysPromptForDownloadLocation;

        this.#useAdvancedGetRaw = options.useAdvancedGetRaw;
        this.#useEnhancedLogging = options.useEnhancedLogging;

        this.#useFilenamePattern = options.useFilenamePattern && options.filenamePattern.length > 0;
        this.#filenamePattern = options.filenamePattern;
        this.#maxFilenameSubjectLength = options.maxFilenameSubjectLength;

        this.#omitDuplicates = options.omitDuplicates;

        this.#tagMessagesEnabled = options.tagMessagesEnabled;

        this.#useMailFolderId = options.useMailFolderId;
    }

    #onFolderProcessed(folderPath) {
        this.#reportFolderProcessed({ folderPath: folderPath, processedFolderCount: ++this.#processedFolderCount });

        if (this.#processedFolderCount == this.#selectedFolderPaths.size) {
            this.#reportProcessingComplete();
        }
    }

    async getFolderSummary(includeSubfolders = true) {
        const platformInfo = await messenger.runtime.getPlatformInfo();

        this.#platformOs = platformInfo.os;

        var result = {
            folderCount: 0,
            messageCount: 0,
            folders: []
        };

        this.#folderCounts = new Map();

        for (const folder of this.#folders) {
            const folderSummaryInfo = await this.#queryFolder(folder, includeSubfolders, result);
            result.folders.push(folderSummaryInfo);
        }

        return result;
    }

    async #queryFolder(folder, includeSubfolders, summary) {
        summary.folderCount++;
        this.#folderCount++;

        const folderParam = this.#useMailFolderId ? folder.id : folder;

        const folderInfo = await messenger.folders.getFolderInfo(folderParam);

        this.#folderCounts.set(folder.path, folderInfo.totalMessageCount);

        summary.messageCount += folderInfo.totalMessageCount;

        const result = {
            path: folder.path,
            messageCount: folderInfo.totalMessageCount,
            subFolders: []
        };

        if(includeSubfolders) {
            for (const subFolder of folder.subFolders) {
                const subFolderSummaryInfo = await this.#queryFolder(subFolder, true, summary);
                result.subFolders.push(subFolderSummaryInfo);
            }
        }

        return result;
    }

    async discoverAttachments(discoveryOptions) {
        const { selectedFolderPaths, includeEmbeds, fileTypeFilter } = discoveryOptions;

        this.#selectedFolderPaths = selectedFolderPaths;
        this.#includeEmbeds = includeEmbeds;
        this.#fileTypeFilter = fileTypeFilter;

        this.#alterationTracker = [];

        const selectedFolders = [];

        for (const folder of this.#folders) {
            this.#processFolder(folder, selectedFolders);
        }

        const queue = ((this.#silentModeInvoked)
            ? selectedFolders
            : selectedFolders.sort((a,b) => this.#folderCounts.get(a.path) - this.#folderCounts.get(b.path))
        )
        .values();

        Array(10).fill().forEach(async () => {
            for(let item of queue) {
                await this.#processPages(item);
            }
        });
    }

    #processFolder(folder, selectedFolders) {
        if (this.#selectedFolderPaths.has(folder.path)) {
            selectedFolders.push(folder);
        }

        for (const subFolder of folder.subFolders) {
            this.#processFolder(subFolder, selectedFolders);
        }
    }

    async #processPages(folder) {
        const folderParam = this.#useMailFolderId ? folder.id : folder;

        let page = await messenger.messages.list(folderParam);

        const folderStats = {
            folderPath: folder.path,
            processedMessageCount: 0,
            attachmentMessageCount: 0,
            attachmentCount: 0,
            attachmentSize: 0,
            embedCount: 0,
            lastFileName: null
        };

        this.#reportFolderProcessing(folder.path);

        await this.#processPage(page, folderStats, true);

        while (page.id) {
            page = await messenger.messages.continueList(page.id);

            await this.#processPage(page, folderStats, false);
        }

        this.#onFolderProcessed(folder.path);
    }

    async #processPage(page, folderStats) {
        for (const message of page.messages) {

            if(!(this.#tagMessagesEnabled && OptionsManager.tagging.isTagged(message.tags))) {
                await this.#processMessage(message, folderStats);
            }

            this.#processedMessageCount++;
            folderStats.processedMessageCount++;

            this.#reportMessageStats({
                summaryProcessedMessageCount: this.#processedMessageCount,
                summaryAttachmentMessageCount: this.#attachmentMessageCount,
                summaryAttachmentCount: this.#attachmentCount,
                summaryAttachmentSize: this.#cumulativeAttachmentSize,
                summaryEmbedCount: this.#embedCount,
                folderPath: folderStats.folderPath,
                processedMessageCount: folderStats.processedMessageCount
            });
        }
    }


    async #processMessage(message, folderStats) {
        const messageInfo = {
            folderPath: folderStats.folderPath,
            author: message.author,
            date: message.date,
            subject: message.subject
        };

        const identifyAttachmentsResult = await this.#identifyAttachments(message, folderStats);

        const hasEmbeds = await this.#identifyEmbeds(message, folderStats, identifyAttachmentsResult);

        if(identifyAttachmentsResult.hasAttachments || hasEmbeds) {
            this.messageList.set(message.id, messageInfo);
        }
    }

    async #identifyAttachments(message, folderStats) {
        const result = {
            hasAttachments: false,
            fullMessage: null,
            omissionSet: new Set()
        };

        let messageAttachmentList = [];
        
        try {
            this.#log(`List message attachments: ${message.date} - ${message.subject}`);

            messageAttachmentList = await messenger.messages.listAttachments(message.id);
        }
        catch(e) {
            const errorInfo = { 
                source: "#processMessage / messenger.messages.listAttachments",
                messageId: message.id,
                folder: folderStats.folderPath,
                author: message.author,
                date: message.date,
                subject: message.subject,
                error: `${e}`
            };

            this.#log(errorInfo, true);

            this.#reportAttachmentStats(this.#compileAttachmentStats(folderStats));

            return result;
        }

        if (messageAttachmentList.length > 0) {
            this.#log(`Get full message: ${message.date} - ${message.subject}`);

            result.fullMessage = await messenger.messages.getFull(message.id);
            const fullMessage = result.fullMessage;

            this.#log(`Generate alteration map: ${message.date} - ${message.subject}`);
            const alterationMap = this.#generateAlterationMap(fullMessage.parts, message);

            const fileTypeFilter = this.#fileTypeFilter;

            for (const attachment of messageAttachmentList) {
                if(attachment.name == "") {
                    continue;
                }

                // If this is an embed, handle in the original manner
                if(attachment.contentId){
                    // Test that this actually IS an embed...
                    const getPart = (parentPart, partName) => {
                        let result = null;
                        
                        if(parentPart.parts) {
                            for(const childPart of parentPart.parts) {
                                if(childPart.partName == partName) {
                                    result = childPart;
                                }
                                else {
                                    result = getPart(childPart, partName)
                                }

                                if(result) {
                                    break;
                                }
                            }
                        }

                        return result;
                    };

                    const attachmentPart = getPart(fullMessage, attachment.partName);

                    if(attachmentPart && attachmentPart.headers) {
                        const contentDisposition = attachmentPart.headers["content-disposition"];
                        
                        if(contentDisposition && contentDisposition.length > 0) {
                            if(contentDisposition[0].startsWith("inline")) {
                                continue;
                            }
                        }
                    }
                }

                if(alterationMap.has(attachment.partName)) {
                    const alterationEntry = alterationMap.get(attachment.partName);

                    alterationEntry.name = attachment.name;
                    result.omissionSet.add(attachment.partName);

                    continue;
                }

                let { filename, extension } = this.#processFileName(attachment.name, attachment.contentType);

                if (fileTypeFilter) {
                    if(!(fileTypeFilter.selectedExtensions.has(extension) || (fileTypeFilter.includeUnlisted && !fileTypeFilter.listedExtensions.has(extension)))) {
                        continue;
                    }
                }

                const attachmentInfo = {
                    messageId: message.id,
                    originalFilename: attachment.name,
                    outputFilename: filename,
                    date: message.date,
                    partName: attachment.partName,
                    contentType: attachment.contentType,
                    size: attachment.size,
                    extension: extension,
                    isEmbed: false,
                    isPreviewable: this.#previewSet.has(extension)
                };
    
                result.omissionSet.add(attachment.partName);

                if(attachmentInfo.size < 1 || attachmentInfo.size == 238) {
                    try {
                        this.#log(`Get attachment file message: ${message.date} - ${message.subject}: original filename = ${attachmentInfo.originalFilename} size = ${attachmentInfo.size}`);

                        const attachmentFile = await this.#getAttachmentFile(attachmentInfo.messageId, attachmentInfo.partName);

                        if(attachmentFile.size == 0) {
                            throw new Error(i18nText.missingAttachment);
                        }

                        attachmentInfo.size = attachmentFile.size;
                    }
                    catch(e) {
                        alterationMap.set(attachmentInfo.partName, {
                            originalFilename: attachmentInfo.originalFilename,
                            outputFilename: attachmentInfo.outputFilename,
                            alteration: "missing",
                            author: message.author,
                            subject: message.subject,
                            date: message.date,
                            timestamp: null,
                            fileUrl: null
                        });

                        const errorInfo = { 
                            source: "#processMessage / browser.messages.getAttachmentFile",
                            messageId: message.id,
                            folder: folderStats.folderPath,
                            author: message.author,
                            date: message.date,
                            subject: message.subject,
                            error: `${e}`
                        };

                        this.#log(errorInfo, true);

                        continue;
                    }
                }

                this.attachmentList.push(attachmentInfo);
                result.hasAttachments = true;

                this.#attachmentCount++;
                folderStats.attachmentCount++;

                this.#cumulativeAttachmentSize += attachmentInfo.size;
                folderStats.attachmentSize += attachmentInfo.size;

                folderStats.lastFileName = attachment.name;
            }

            if(alterationMap.size > 0) {
                this.#alterationTracker.push(...alterationMap.values());
            }

            if(result.hasAttachments) {
                this.#attachmentMessageCount++;
                folderStats.attachmentMessageCount++;
            }
        }

        this.#reportAttachmentStats(this.#compileAttachmentStats(folderStats));

        folderStats.lastFileName = null;

        return result;
    }

    async #identifyEmbeds(message, folderStats, identifyAttachmentsResult) {
        let result = false;

        if(this.#includeEmbeds) {
            let {
                hasAttachments,
                fullMessage,
                omissionSet
            } = identifyAttachmentsResult;

            if(!fullMessage) {
                fullMessage = await messenger.messages.getFull(message.id);
            }

            if(fullMessage.parts) {
                const embeds = EmbedManager.identifyEmbeds(message.id, message.date, fullMessage, omissionSet);

                if(embeds.length > 0) {
                    let messageCharset = null;

                    if(!this.#useAdvancedGetRaw) {
                        const identifyMessageCharsetResult = this.#identifyMessageCharset(fullMessage.parts);

                        messageCharset = identifyMessageCharsetResult.charset;
                    }

                    for(const embed of embeds) {
                        let { filename, extension } = this.#processFileName(embed.originalFilename, embed.contentType);

                        embed.outputFilename = filename;
                        embed.extension = extension;
                        embed.charset = messageCharset;
                    }

                    this.attachmentList.push(...embeds);

                    folderStats.lastFileName = embeds[0].originalFilename;

                    this.#embedCount+= embeds.length;
                    folderStats.embedCount+= embeds.length;

                    if(!hasAttachments) {
                        this.#attachmentMessageCount++;
                        folderStats.attachmentMessageCount++;
                    }

                    this.#reportAttachmentStats(this.#compileAttachmentStats(folderStats));

                    result = true;
                }
            }

            folderStats.lastFileName = null;
        }

        return result;
    }

    #identifyMessageCharset(parts, result = { success: false, charset: "utf-8" } ) {
        const charsetRegex = /charset=[\"']?(?<charset>[A-Za-z0-9\-_:]+)/g;

        for(const part of parts) {
            if(part.headers) {
                const contentTypeHeader = part.headers["content-type"];

                if(contentTypeHeader.length > 0) {
                    const contentType = contentTypeHeader[0];
                    
                    charsetRegex.lastIndex = 0;
                    const matches = charsetRegex.exec(contentType);

                    if(matches && matches.groups && matches.groups.charset) {
                        result.charset = matches.groups.charset.toLowerCase();
                        result.success = true;

                        this.#log(result.charset);

                        break;
                    }

                    if(part.parts) {
                        this.#identifyMessageCharset(part.parts, result);

                        if(result.success) {
                            break;
                        }
                    }
                }
            }
        }

        return result;
    }

    #compileAttachmentStats(folderStats) {
        return {
            summaryProcessedMessageCount: this.#processedMessageCount,
            summaryAttachmentMessageCount: this.#attachmentMessageCount,
            summaryAttachmentCount: this.#attachmentCount,
            summaryAttachmentSize: this.#cumulativeAttachmentSize,
            summaryEmbedCount: this.#embedCount,
            folderPath: folderStats.folderPath,
            attachmentMessageCount: folderStats.attachmentMessageCount,
            attachmentCount: folderStats.attachmentCount,
            attachmentSize: folderStats.attachmentSize,
            embedCount: folderStats.embedCount,
            lastFileName: folderStats.lastFileName
        };
    }

    #generateAlterationMap(parts, message, alterationMap = new Map()) {
        for(const part of parts) {
            this.#log(`Alteration map gen: ${part.partName}`);

            let alteration = null;
            let timestamp = null;
            let fileUrl = null;

            if(part.headers && part.headers["x-mozilla-altered"]) {
                const alterationTokens = part.headers["x-mozilla-altered"][0].split(";");
                alteration = "unknown";

                try {
                    // Example: 'AttachmentDetached; date="Sun Oct 10 11:34:37 2010"'
                    alteration = (alterationTokens[0] == "AttachmentDetached") ? "detached" : "deleted";
                    timestamp = alterationTokens[1].split('"')[1];
                    if(alteration == "detached") {
                        fileUrl = part.headers["x-mozilla-external-attachment-url"][0];
                    }
                }
                catch(e) {
                    this.#log(e, true);
                }
              
            }
            else if(part.contentType == "text/x-moz-deleted") {
                alteration = "deleted";
            }

            if(alteration) {
                const alterationEntry = {
                    originalFilename: part.name,
                    outputFilename: part.name,
                    alteration: alteration,
                    author: message.author,
                    subject: message.subject,
                    date: message.date,
                    timestamp: timestamp,
                    fileUrl: fileUrl
                };

                alterationMap.set(part.partName, alterationEntry);

                this.#log(alterationEntry);
            }

            if(part.parts) {
                this.#generateAlterationMap(part.parts, message, alterationMap);
            }
        }

        return alterationMap;
    }

    getAttachmentCounts() {
        return {
            attachmentCount: this.#attachmentCount,
            embedCount: this.#embedCount
        }
    }

    reset() {
        this.#folderCount = 0;
        this.#processedFolderCount = 0;
        this.#processedMessageCount = 0;
        this.#attachmentMessageCount = 0;
        this.#attachmentCount = 0;
        this.#cumulativeAttachmentSize = 0;
        this.#embedCount = 0;

        this.#selectedFolderPaths = null;

        this.messageList.clear();
        this.attachmentList.length = 0;

        this.#groupingSet.clear();

        this.#alterationTracker = null;
        this.#packagingTracker = null;
        this.#duplicateFileTracker = null;
        this.#sequentialFilenameTracker = null;
        this.#duplicateEmbedFileTracker = null;
        this.#sequentialEmbedFilenameTracker = null;
        this.#packagingErrorList = null;
        this.#packagingFilenameList = null;

        this.#detachmentErrorList = null;
    }

    getGrouping(groupingKey) {
        let result = this.#groupingSet.get(groupingKey);

        if(!result) {
            result = this.#populateGroupingSet(groupingKey);
        }

        return result;
    }

    #populateGroupingSet(groupingKey) {
        var result = new Map();

        for(let i = 0; i < this.attachmentList.length; i++) {
            const attachment = this.attachmentList[i];

            let subKey = "";

            switch(groupingKey) {
                case "Extension":
                    subKey = attachment.extension;
                    break;
                case "Folder":
                    subKey = this.messageList.get(attachment.messageId).folderPath;
                    break;
                case "Author":
                    subKey = this.messageList.get(attachment.messageId).author;
                    break;
            }

            this.#addGroupingItem(result, subKey, i);
        }

        this.#groupingSet.set(groupingKey, result);

        return result;
    }

    #addGroupingItem(grouping, key, value) {
        if(grouping.has(key))
        {
            grouping.get(key).push(value);
        }
        else {
            grouping.set(key, [value]);
        }
    }

    getAlterationCount() {
        return this.#alterationTracker.length;
    }

    async extract(list, getInfo, extractOptions) {
        // Preparation phase

        const {
            preserveFolderStructure,
            includeEmbeds,
            packageAttachments,
            tagMessages
        } = extractOptions;

        this.#tagMessages = this.#tagMessagesEnabled && tagMessages;

        const storageProgressInfo = {
            status: "started",

            alterationCount: this.getAlterationCount(),

            duplicateCount: 0,
            duplicateTotalBytes: 0,

            totalItems: 0,                  // items.length,
            includedCount: 0,
            totalBytes: 0,

            totalEmbedItems: 0,             // this.#embedCount,
            includedEmbedCount: 0,
            duplicateEmbedCount: 0,
            totalEmbedBytes: 0,

            errorCount: 0,

            fileCount: 0,
            filesCreated: 0,

            packageAttachments: packageAttachments,
            lastFileName: ""
        };

        this.#reportStorageProgress(storageProgressInfo);

        storageProgressInfo.status = "preparing";

        const selectedItemKeys = new Set(list.map((item) => {
            const info = getInfo(item);

            return `${info.messageId}:${info.partName}`;
        }));

        this.#packagingTracker = {
            items: [],
            extractionSubsets: [],
            currentPackageIndex: 0,
            embedItems: [],
            totalEmbedMessageCount: 0,
            preserveFolderStructure: preserveFolderStructure,
            lastDownloadId: null,
            downloadLocations: new Map()
        };

        this.#packagingFilenameList = [];

        const packagingTracker = this.#packagingTracker;

        const items = packagingTracker.items;
        const embedItems = packagingTracker.embedItems;

        this.#duplicateFileTracker = [];

        const duplicateKeys = new Set();

        let cumulativeSize = 0;

        // Segregate embedded/inline imags, determine selected items and identify/isolate attachment duplicates

        const omitDuplicates = this.#omitDuplicates;

        for(const item of this.attachmentList) {
            if(selectedItemKeys.has(`${item.messageId}:${item.partName}`)) {
                if(item.isEmbed) {
                    if(includeEmbeds) {
                        embedItems.push(item);
                    }
                }
                else {
                    const { originalFilename } = item;

                    const duplicateKey = `${originalFilename}:${item.size}`;

                    if(omitDuplicates && duplicateKeys.has(duplicateKey)) {
                        this.#duplicateFileTracker.push({
                            messageId: item.messageId,
                            partName: item.partName,
                            originalFilename: originalFilename,
                            outputFilename: item.outputFilename,
                            size: item.size,
                            isDeleted: false
                        });

                        storageProgressInfo.duplicateCount++;
                        storageProgressInfo.duplicateTotalBytes += item.size;

                        this.#reportStorageProgress(storageProgressInfo);
                    }
                    else {
                        item.isDeleted = false;
                        items.push(item);
                        
                        if(omitDuplicates) {
                            duplicateKeys.add(duplicateKey);
                        }
                        
                        cumulativeSize += item.size;
                    }
                }
            }
        }

        // Determine packaging sets

        items.sort((a, b) => a.size - b.size);

        const maxSize = 750_000_000;
//        const maxSize = 100_000_000;
        let currentSize = 0;
        let currentStart = 0;

        const extractionSubsets = packagingTracker.extractionSubsets;

        if(cumulativeSize > maxSize) {
            for(const item of items) {
                if(currentSize + item.size > maxSize) {

                    extractionSubsets.push(currentStart);

                    cumulativeSize -= currentSize;

                    if(cumulativeSize <= maxSize) {
                        break;
                    }

                    currentSize = 0;
                }

                currentSize += item.size;
                currentStart++;
            }
        }

        extractionSubsets.push(items.length);

        storageProgressInfo.fileCount = packagingTracker.extractionSubsets.length;
        
        if(embedItems.length > 0 && items.length > 0) {
            storageProgressInfo.fileCount++;
        }

        storageProgressInfo.totalItems = items.length;
        storageProgressInfo.totalEmbedItems = embedItems.length;

        // Begin Packaging phase...
        storageProgressInfo.status = "prepackaging";

        this.#reportStorageProgress(storageProgressInfo);

        this.#packagingErrorList = [];

        this.#sequentialFilenameTracker = new Map();

        let extractionCompleted = true;

        if(items.length > 0) {
            extractionCompleted = await this.#extractAttachments(storageProgressInfo);
        }

        if(embedItems.length > 0 && extractionCompleted) {
            this.#duplicateEmbedFileTracker = new Map();
            this.#sequentialEmbedFilenameTracker = new Map();

            await this.#extractEmbeds(storageProgressInfo);
        }
    }

    async #extractAttachments(storageProgressInfo) {
        const { packageAttachments } = storageProgressInfo;

        const packagingTracker = this.#packagingTracker;
        const errorList = this.#packagingErrorList;
        let currentItemIndex = 0;

        const hasEmbeds = (packagingTracker.embedItems.length > 0);

        storageProgressInfo.status = "packaging";
        this.#reportStorageProgress(storageProgressInfo);

        for(const subsetBoundary of packagingTracker.extractionSubsets) {
            let zipEm;

            if(packageAttachments) {
                zipEm = new ZipEm();
            }

            let packagedMessageIds = new Set();

            for(let i = currentItemIndex; i < subsetBoundary; i++) {
                const item = packagingTracker.items[i];

                item.hasError = false;
    
                let attachmentFile;
    
                try {
                    this.#log(`Packaging - get attachment file: ${item.name}`);
    
                    attachmentFile = await this.#getAttachmentFile(item.messageId, item.partName);
    
                    if(attachmentFile.size == 0) {
                        throw new Error(i18nText.missingAttachment);
                    }
                }
                catch(e) {
                    item.hasError = true;
    
                    errorList.push({
                        messageId: item.messageId,
                        originalFilename: item.originalFilename,
                        outputFilename: item.outputFilename,
                        size: item.size,
                        scope: "getFileData",
                        error: e.toString()
                    });
    
                    storageProgressInfo.errorCount = errorList.length;
    
                    this.#reportStorageProgress(storageProgressInfo);
    
                    const rootMessage = this.messageList.get(item.messageId);
    
                    const errorInfo = { 
                        source: "#processMessage / browser.messages.getAttachmentFile",
                        rootMessageId: item.messageId,
                        folder: rootMessage.folderPath,
                        author: rootMessage.author,
                        date: rootMessage.date,
                        subject: rootMessage.subject,
                        error: `${e}`
                    };
    
                    this.#log(errorInfo, true);
    
                    continue;
                }
    
                let { outputFilename } = item;

                if(this.#useFilenamePattern && this.#filenamePattern) {
                    outputFilename = this.#generateAlternateFilename(item)
                    item.outputFilename = outputFilename;
                }
    
                // Sequentialize the output filename, if necessary
                outputFilename = this.#sequentializeFilename(this.#sequentialFilenameTracker, outputFilename);
                item.outputFilename = outputFilename;

                storageProgressInfo.lastFileName = outputFilename;

                // Add the path (TB folder hierarchy) if that option is selected
                if(packageAttachments && packagingTracker.preserveFolderStructure) {
                    const message = this.messageList.get(item.messageId);
                    outputFilename = `${message.folderPath.slice(1)}/${outputFilename}`;
                }
    
                // Attempt to save/package the attachment
                try {
                    this.#log(`Packaging - add file to zip buffer: ${item.outputFilename}`);
    
                    if(packageAttachments) {
                        await zipEm.addFile(outputFilename, attachmentFile, item.date);

                        packagedMessageIds.add(item.messageId);
                    }
                    else {
                        const saveResult = await this.#saveAttachment(attachmentFile, item.outputFilename);

                        packagingTracker.lastDownloadId = saveResult.downloadId;

                        this.tagMessages([item.messageId]);
                    }
    
                    storageProgressInfo.includedCount++;
                    storageProgressInfo.totalBytes += item.size;
    
                    item.packagingFilenameIndex = this.#packagingFilenameList.length;
                }
                catch(e) {
                    item.hasError = true;
    
                    errorList.push({
                        messageId: item.messageId,
                        originalFilename: item.originalFilename,
                        outputFilename: item.outputFilename,
                        size: item.size,
                        scope: "addToZip",
                        error: e.toString()
                    });
    
                    storageProgressInfo.errorCount = errorList.length;
    
                    this.#log(e, true);
                }
    
                this.#reportStorageProgress(storageProgressInfo);
            }

            storageProgressInfo.lastFileName = "...";

            packagingTracker.currentPackageIndex++;

            if(packageAttachments) {
                storageProgressInfo.status = "downloading";
                this.#reportStorageProgress(storageProgressInfo);

                const saveResult = await this.#saveZipFile(zipEm, storageProgressInfo);

                const isFinal = (packagingTracker.currentPackageIndex == packagingTracker.extractionSubsets.length);

                if(saveResult.success) {
                    storageProgressInfo.filesCreated++;

                    this.#reportStorageProgress(storageProgressInfo);

                    await this.#updateDownloadLocations(saveResult.downloadId);

                    if(isFinal && !hasEmbeds) {
                        saveResult.attachmentCount = packagingTracker.items.length;
                        saveResult.downloadLocations = packagingTracker.downloadLocations;

                        this.#reportSaveResult(saveResult);
                    }

                    this.tagMessages(packagedMessageIds);
                    packagedMessageIds = new Set();
                }
                else {
                    saveResult.downloadLocations = packagingTracker.downloadLocations;
                    this.#reportSaveResult(saveResult);

                    return false;
                }
            }

            currentItemIndex = subsetBoundary;
        }

        if(!packageAttachments) {
            if(packagingTracker.lastDownloadId) {
                await this.#updateDownloadLocations(packagingTracker.lastDownloadId);
            }

            if(!hasEmbeds) {
                this.#reportSaveResult({
                    status: "success",
                    message: i18nText.saveComplete,
                    attachmentCount: packagingTracker.items.length,
                    downloadLocations: packagingTracker.downloadLocations                    
                });
            }
        }

        return true;
    }

    async #extractEmbeds(storageProgressInfo) {
        const { packageAttachments } = storageProgressInfo;

        const packagingTracker = this.#packagingTracker;
        const duplicateEmbedFileTracker = this.#duplicateEmbedFileTracker;
        const errorList = this.#packagingErrorList;

        const embedItems = packagingTracker.embedItems;
        let groupedEmbedItems = new Map();

        for(const item of embedItems) {
            const messageId = item.messageId;

            if(groupedEmbedItems.has(messageId)) {
                groupedEmbedItems.get(messageId).push(item);
            }
            else {
                groupedEmbedItems.set(messageId, [item]);
            }
        }

        groupedEmbedItems = [...groupedEmbedItems.entries()];

        if(packagingTracker.totalEmbedMessageCount == 0) {
            packagingTracker.totalEmbedMessageCount = groupedEmbedItems.length;
        }
        else {
            storageProgressInfo.fileCount++;
        }

        const maxSize = 750_000_000;
        let currentSize = 0;

        let zipEm;

        if(packageAttachments) {
            zipEm = new ZipEm();
        }

//        let packagedMessageIds = new Set();

        storageProgressInfo.status = "packaging";

        for(let i = 0; i < groupedEmbedItems.length; i++) {
            const messageItems = groupedEmbedItems[i];

            const messageId = messageItems[0];
            const messageEmbedItems = messageItems[1];
            const messageCharset = messageEmbedItems[0].charset;

            await EmbedManager.extractEmbeds(messageId, messageEmbedItems, messageCharset);

            currentSize += messageEmbedItems.reduce((sum, item) => sum + item.size, 0);

            if(currentSize > maxSize && packageAttachments) {
                storageProgressInfo.fileCount++;
                this.#reportStorageProgress(storageProgressInfo);

                const saveResult = await this.#saveZipFile(zipEm, storageProgressInfo, "embeds");

                if(saveResult.success) {
                    storageProgressInfo.filesCreated++;

                    this.#reportStorageProgress(storageProgressInfo);

                    await this.#updateDownloadLocations(saveResult.downloadId);

//                    this.tagMessages(packagedMessageIds);
//                    packagedMessageIds = new Set();

                    zipEm = new ZipEm();
                    currentSize = 0;
                    i--;
                    
                    continue;
                }
                else {
                    saveResult.downloadLocations = packagingTracker.downloadLocations;
                    this.#reportSaveResult(saveResult);

                    return;
                }
            }

            for(const item of messageEmbedItems) {
                if(item.error) {
                    item.hasError = true;

                    errorList.push({
                        messageId: item.messageId,
                        originalFilename: item.originalFilename,
                        outputFilename: item.outputFilename,
                        size: item.size,
                        scope: "extractEmbeds",
                        error: item.error
                    });

                    const message = this.messageList.get(item.messageId);

                    this.#log(`Embed error: ${message.author} ${message.folderPath} - ${item.date} :${item.error}`, true);

                    storageProgressInfo.errorCount = errorList.length;

                    this.#reportStorageProgress(storageProgressInfo);
                    continue;
                }

                let { originalFilename, outputFilename } = item;

                const decodeData = item.decodeData;

                // Omit duplicate files (exact original filename, size, and checksum comparison)

                // Matching original filename
                if(duplicateEmbedFileTracker.has(originalFilename)) {
                    const nameDuplicate = duplicateEmbedFileTracker.get(originalFilename);

                    // Matching file size
                    if(nameDuplicate.sizes.has(item.size)) {
                        const sizeDuplicate = nameDuplicate.sizes.get(item.size);

                        // Matching checksum; skip this item (duplicate)
                        if(sizeDuplicate.has(decodeData.checksum)) {
                            const checksumDuplicate = sizeDuplicate.get(decodeData.checksum);

                            checksumDuplicate.push(item.messageId);
                            item.isDuplicate = true;

                            storageProgressInfo.duplicateEmbedCount++;
                            storageProgressInfo.duplicateTotalBytes += item.size;

                            this.#reportStorageProgress(storageProgressInfo);
                            continue;
                        }
                        // Different checksum
                        else {
                            sizeDuplicate.set(decodeData.checksum, []);
                        }
                    }
                    // Different size
                    else {
                        nameDuplicate.sizes.set(item.size, new Map([[decodeData.checksum, []]]));
                    }
                }
                // Unregistered original filename
                else {
                    const checksumEntry = new Map([[decodeData.checksum, []]]);
                    duplicateEmbedFileTracker.set(originalFilename, { count: 1, sizes: new Map([[item.size, checksumEntry]]) });
                }

                // Modify the output filename if a pattern has been assigned
                if(this.#useFilenamePattern && this.#filenamePattern) {
                    outputFilename = this.#generateAlternateFilename(item);
                    item.outputFilename = outputFilename;
                }

                // Sequentialize the filename, if necessary
                outputFilename = this.#sequentializeFilename(this.#sequentialEmbedFilenameTracker, outputFilename);
                item.outputFilename = outputFilename;


                storageProgressInfo.lastFileName = outputFilename;
    
                if(packageAttachments && packagingTracker.preserveFolderStructure) {
                    const message = this.messageList.get(item.messageId);
                    outputFilename = `${message.folderPath.slice(1)}/${outputFilename}`;
                }

                try {
                    if(packageAttachments) {
                        await zipEm.addFile(outputFilename, new Blob([decodeData.data]), item.date);

//                        packagedMessageIds.add(item.messageId);
                    }
                    else {
                        const saveResult = await this.#saveAttachment(new Blob([decodeData.data]), outputFilename);

                        packagingTracker.lastDownloadId = saveResult.downloadId;

//                        this.tagMessages([item.messageId]);
                    }

                    storageProgressInfo.totalEmbedBytes += decodeData.data.length;
                    storageProgressInfo.includedEmbedCount++;

                    item.packagingFilenameIndex = this.#packagingFilenameList.length;
                }
                catch(e) {
                    item.hasError = true;

                    errorList.push({
                        messageId: item.messageId,
                        originalFilename: item.originalFilename,
                        outputFilename: item.outputFilename,
                        size: item.size,
                        scope: "packageEmbeds",
                        error: `${e}`
                    });

                    storageProgressInfo.errorCount = errorList.length;
                }
                finally {
                    item.decodeData = null;
                }
            }

            this.#reportStorageProgress(storageProgressInfo);

//            packagingTracker.currentEmbedMessageIndex = i + 1;
        }

        if(packageAttachments) {
            storageProgressInfo.lastFileName = "...";
            this.#reportStorageProgress(storageProgressInfo);
            
            const saveResult = await this.#saveZipFile(zipEm, storageProgressInfo, "embeds");

            if(saveResult.success) {
                storageProgressInfo.filesCreated++;

                this.#reportStorageProgress(storageProgressInfo);

                await this.#updateDownloadLocations(saveResult.downloadId);

//                this.tagMessages(packagedMessageIds);

                saveResult.attachmentCount = packagingTracker.items.length;
                saveResult.downloadLocations = packagingTracker.downloadLocations;
            }

            saveResult.downloadLocations = packagingTracker.downloadLocations;
            this.#reportSaveResult(saveResult);
        }
        else {
            // TODO: Add error handling in rare instance saving a file fails

            if(packagingTracker.lastDownloadId) {
                await this.#updateDownloadLocations(packagingTracker.lastDownloadId);
            }

            this.#reportSaveResult({
                status: "success",
                message: i18nText.saveComplete,
                attachmentCount: packagingTracker.items.length,
                downloadLocations: packagingTracker.downloadLocations
            });
        }
    }

    async #saveZipFile(zipEm, storageProgressInfo, disposition = "attachments") {
        let zipFile;

        try {
            zipFile = await zipEm.complete();
        }
        catch(e) {
            this.#log(e, true);

            return;             // TODO: Include return value
        }

        const saveOptions = {
            fileData: zipFile,
            filename: `${i18nText[disposition]}-${new Date().getTime()}.zip`,
            saveAs: this.#alwaysPromptForDownloadLocation,
            onSaveStarted: (downloadItem) => {
                this.#packagingFilenameList.push(downloadItem.filename);
            }
        };


        storageProgressInfo.status = "downloading";
        this.#reportStorageProgress(storageProgressInfo);

        let result = await SaveManager.save(saveOptions);
        return result;
    }

    async #saveAttachment(fileData, filename) {
        const saveOptions = {
            fileData: fileData,
            filename: filename,
            saveAs: false
        };
        
        let result = await SaveManager.save(saveOptions);
        return result;
    }

    async #updateDownloadLocations(downloadId, isReport = false) {
        const { downloadLocations } = this.#packagingTracker;

        const path = await SaveManager.getFolderByDownloadId(downloadId);

        if(!downloadLocations.has(path)) {
            downloadLocations.set(path, downloadId);
        }
    }

    async tagMessages(messageIds) {
        if(this.#tagMessages) {
            for(let messageId of messageIds) {
                OptionsManager.tagging.tagMessage(messageId);
            }
        }
    }

    async deleteAttachments() {
        const packagedItems = this.#packagingTracker.items.filter((item) => !item.hasError);
        const duplicateItems = this.#duplicateFileTracker;

        const info = {
            status: "started",
            totalItems: packagedItems.length + duplicateItems.length,
            processedCount: 0,
            errorCount: 0,
            lastFileName: "..."
        };

        this.#reportDetachProgress(info);

        info.status = "executing";

        const attachmentGroupings = new Map();

        for (let item of [...packagedItems, ...duplicateItems]) {
            if(attachmentGroupings.has(item.messageId)) {
                const items = attachmentGroupings.get(item.messageId);
                items.push(item);
            }
            else {
                attachmentGroupings.set(item.messageId, [item]);
            }
        }

        this.#detachmentErrorList = [];

        for(let [messageId, items] of attachmentGroupings) {

            info.lastFileName = items[0].originalFilename;
            const partNames = items.map((item => item.partName));
            const cumulativeSize = items.reduce((cs, i) => cs + i.size, 0);

            const message = this.messageList.get(messageId);

            this.#log(`Begin detach: ${message.author} ~ ${message.date} : ${info.lastFileName}`);

            try {
                await messenger.messages.deleteAttachments(messageId, partNames);

                this.#log(`End detach: ${message.author} ~ ${message.date} : ${info.lastFileName}`);

                for(let item of items) {
                    item.isDeleted = true;
                }

                info.processedCount += partNames.length;
            }
            catch(e) {
                this.#detachmentErrorList.push({
                    messageId: messageId,
                    originalFilename: info.lastFileName,
                    outputFilename: info.lastFileName,
                    size: cumulativeSize,
                    scope: "detach",
                    error: e.toString()
                });
                
                info.errorCount += partNames.length;

                this.#log(e, true);
            }

            this.#reportDetachProgress(info);
        }
 
        this.#reportDetachResult(info);
    }

    getReportData() {
        const result = {
            packagingFilenameList: this.#packagingFilenameList,
            packagingTracker: this.#packagingTracker,
            duplicateFileTracker: this.#duplicateFileTracker,
            duplicateEmbedFileTracker: this.#duplicateEmbedFileTracker,
            alterationTracker: this.#alterationTracker,
            errorList: this.#packagingErrorList,
            detachmentErrorList: this.#detachmentErrorList
        };

        return result;
    }

    async getAttachmentFileData(messageId, partName) {
        const attachmentFile = await this.#getAttachmentFile(messageId, partName);

        const result = await new Promise((resolve) => {
            const fileReader = new FileReader();
            fileReader.onload = (e) => resolve(fileReader.result);
            fileReader.readAsDataURL(attachmentFile);
        });

        return result;
    }

    async #getAttachmentFile(messageId, partName) {
        const attachmentFile = await browser.messages.getAttachmentFile(messageId, partName);

        return attachmentFile;
    }

    #generateAlternateFilename(item) {
        let result = this.#filenamePattern;
        
        let { outputFilename } = item;
        const message = this.messageList.get(item.messageId);

        // Source
        if(result.indexOf("{sender}") > -1) {
            const authorParts = this.#parseAuthorField(message.author);

            if(authorParts.sender) {
                result = result.replace("{sender}", authorParts.sender);
            }
            else {
                result = result.replace("{sender}", "_");
            }
        }
        else if(result.indexOf("{author}") > -1) {
            const authorParts = this.#parseAuthorField(message.author);

            if(authorParts.author) {
                result = result.replace("{author}", authorParts.author);
            }
            else if(authorParts.sender) {
                result = result.replace("{author}", authorParts.sender);
            }
            else {
                result = result.replace("{author}", "_");
            }
        }

        for(let dateFormat of ["{mm-dd-yyyy}", "{dd-mm-yyyy}", "{yyyy-mm-dd}", "{dd.mm.yyyy}", "{yyyy.mm.dd}", "{yyyymmdd}"]) {
            if(result.indexOf(dateFormat) > -1) {
                result = result.replace(dateFormat, this.#getFormattedDate(message.date, dateFormat));
                break;
            }
        }

        if(result.indexOf("{timestamp}") > -1) {
            result = result.replace("{timestamp}", this.#getFormattedTimestamp(message.date));
        }

        if(result.indexOf("{subject}") > -1) {
            result = result.replace("{subject}", message.subject.substring(0, this.#maxFilenameSubjectLength));
        }

        if(result.indexOf("{filename}") > -1) {
            let extension = "";

            const segments = outputFilename.split(".");

            if (segments.length > 1) {
                if (segments[segments.length - 1].length < 6) {
                    extension = "." + segments.pop();
                    outputFilename = segments.join('.');
                }
            }

            result = result.replace("{filename}", outputFilename) + extension;
        }

        if(result != this.#filenamePattern) {
            result = this.#normalizeFileName(result);
        }
        else {
            result = outputFilename;
        }

        return result;
    }

    #parseAuthorField(author) {
        const authorRegex = /((?<author>[\w\s]*)(\<))?\s*(?<sender>[\w\-\.]+@([\w-]+\.)+[\w-]{2,})\s*(\>)?/gi

        const result = {
            sender: null,
            author: null
        }

        const matches = authorRegex.exec(author);

        if(matches && matches.groups) {
            const groups = matches.groups;

            if(groups.author) {
                result.author = groups.author.trim();
            }

            if(groups.sender) {
                result.sender = groups.sender.trim();
            }
        }

        return result;
    }

    #getFormattedDate(date, formatString) {
        const dateParts = {
            yyyy: date.getFullYear().toString(),
            mm: (date.getMonth() + 1).toString().padStart(2, "0"),
            dd: date.getDate().toString().padStart(2, "0")
        }

        switch(formatString) {
            case "{mm-dd-yyyy}":
                return `${dateParts.mm}-${dateParts.dd}-${dateParts.yyyy}`;
            case "{dd-mm-yyyy}":
                return `${dateParts.dd}-${dateParts.mm}-${dateParts.yyyy}`;
            case "{yyyy-mm-dd}":
                return `${dateParts.yyyy}-${dateParts.mm}-${dateParts.dd}`;
            case "{dd.mm.yyyy}":
                return `${dateParts.dd}.${dateParts.mm}.${dateParts.yyyy}`;
            case "{yyyy.mm.dd}":
                return `${dateParts.yyyy}.${dateParts.mm}.${dateParts.dd}`;
            default:    // yyyymmdd
                return `${dateParts.yyyy}${dateParts.mm}${dateParts.dd}`;
        }
    }

    #getFormattedTimestamp(date) {
        const formatTimeElement = (v) => v.toString().padStart(2, "0");

        return `${formatTimeElement(date.getHours())}${formatTimeElement(date.getMinutes())}${formatTimeElement(date.getSeconds())}`;
    }

    #processFileName(originalFilename, contentType) {
        const result = {
            filename: this.#normalizeFileName(originalFilename),
            extension: "--"
        };

        const segments = result.filename.split(".");

        // If the filename extension can be directly determined...
        if (segments.length > 1 && segments[segments.length - 1].length < 6) {
                result.extension = segments.pop().toLowerCase();
        }
        
        // Otherwise, attempt to infer the extension from the content type value
        else {
            switch(contentType) {
                case "image/jpeg":
                    result.filename += ".jpg";
                    result.extension = "jpg";
                    break;
                case "image/gif":
                    result.filename += ".gif";
                    result.extension = "gif";
                    break;
                case "image/png":
                    result.filename += ".png";
                    result.extension = "png";
            }
        }

        return result;
    }

    #normalizeFileName(filename) {
        const windowsForbiddenCharacterRegex = /[<>:"|?*\/\\]/g;
        const trailingDataDelimiterRegex = /.+?(?=;(?!.*\.+)|$)/;

        let result = filename.trim();

        const trailingDataFilter = result.match(trailingDataDelimiterRegex);

        if(trailingDataFilter.length > 0) {
            result = trailingDataFilter[0];
        }

        switch (this.#platformOs) {
            case "win":
                result = result.replace(windowsForbiddenCharacterRegex, "_");

                let hasReplacement = false;
                const tokens = result.split(".");

                for(let i = 0; i < tokens.length; i++) {
                    const token = tokens[i].toUpperCase();

                    if(this.#windowsForbiddenFileNameSet.has(token)) {
                        tokens[i] = `${tokens[i]}_x`;
                        hasReplacement = true;
                    }
                }

                if(hasReplacement) {
                    result = tokens.join(".");
                }

                break;

            case "linux":
            case "cros":
            case "openbsd":
            case "android":
            case "fuchsia":
                result = result.replace("/", "_");
                break;

            case "mac":
                result = result.replace("/", "_").replace(":", "-");
                break;
        }

        return result;
    }

    #sequentializeFilename(tracker, outputFilename) {
        let result = outputFilename;
        
        let sequenceNumber = 1;
        const duplicateKey = outputFilename.toLowerCase();

        if(tracker.has(duplicateKey)) {
            sequenceNumber = tracker.get(duplicateKey) + 1;

            const paddedSequenceNumber = sequenceNumber.toString().padStart(3, "0");

            const tokens = result.split(".");
    
            const targetTokenIndex = (tokens.length == 1) ? 0 : tokens.length - 2;
    
            tokens[targetTokenIndex] = `${tokens[targetTokenIndex]}_${paddedSequenceNumber}`;
    
            result = tokens.join(".");
        }

        tracker.set(duplicateKey, sequenceNumber)

        return result;
    }

    #log(message, condition = this.#useEnhancedLogging) {
        if(condition) {
            console.log(message);
        }
    }
}