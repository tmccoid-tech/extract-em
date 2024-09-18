import { ZipEm } from "/module/zipem.js";
import { EmbedManager } from "/module/embedmanager.js";

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
    #includeEmbeds = false;
    #useAdvancedGetRaw = true;
    #useEnhancedLogging = false;

    #useFilenamePattern = false;
    #filenamePattern = "";

    #omitDuplicates = true;

    #useMailFolderId = false;

    messageList = new Map();
    attachmentList = [];

    #groupingSet = new Map();

    #reportFolderProcessing = async (info) => {};
    #reportMessageStats = async (folderStats) => {};
    #reportAttachmentStats = async (folderStats) => {};
    #reportFolderProcessed = async (folderPath) => {};
    #reportProcessingComplete = async () => {};

    #reportPackagingProgress = async (info) => {};
    #reportSaveResult = async (info) => {};

    #reportDetachProgress = async (info) => {};
    #reportDetachResult = async (info) => {};

    #alterationTracker;
    #packagingTracker;
    #duplicateFileTracker;
    #duplicateFileNameTracker;
    #duplicateEmbedFileTracker;
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

            this.#reportPackagingProgress = options.reportPackagingProgress;

            this.#reportDetachProgress = options.reportDetachProgress;
            this.#reportDetachResult = options.reportDetachResult;
        }

        this.#reportProcessingComplete = options.reportProcessingComplete;
        this.#reportSaveResult = options.reportSaveResult;

        this.#useAdvancedGetRaw = options.useAdvancedGetRaw;
        this.#useEnhancedLogging = options.useEnhancedLogging;

        this.#useFilenamePattern = options.useFilenamePattern && options.filenamePattern.length > 0;
        this.#filenamePattern = options.filenamePattern;

        this.#omitDuplicates = options.omitDuplicates;

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

    async discoverAttachments(selectedFolderPaths, includeEmbeds = false) {
        this.#selectedFolderPaths = selectedFolderPaths;
        this.#includeEmbeds = includeEmbeds;

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

            await this.#processMessage(message, folderStats);

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
            fullMessage: null
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
            const alterationMap = this.#generateAlterationMap(fullMessage.parts);

            for (const attachment of messageAttachmentList) {
                if(attachment.name == "") {
                    continue;
                }

                if(alterationMap.has(attachment.partName)) {
                    const alterationEntry = alterationMap.get(attachment.partName);

                    alterationEntry.name = attachment.name;

                    continue;
                }

                let extension = "--";

                const segments = attachment.name.split(".");

                if (segments.length > 1) {
                    if (segments[segments.length - 1].length < 6) {
                        extension = segments.pop().toLowerCase();
                    }
                }

                const attachmentInfo = {
                    messageId: message.id,
                    name: this.#normalizeFileName(attachment.name),
                    alternateName: null,
                    date: message.date,
                    partName: attachment.partName,
                    contentType: attachment.contentType,
                    size: attachment.size,
                    extension: extension,
                    isEmbed: false,
                    isPreviewable: this.#previewSet.has(extension)
                };
    
                if(attachmentInfo.size < 1 || attachmentInfo.size == 238) {
                    try {
                        this.#log(`Get attachment file message: ${message.date} - ${message.subject}: name = ${attachmentInfo.name} size = ${attachmentInfo.size}`);

                        const attachmentFile = await this.#getAttachmentFile(attachmentInfo.messageId, attachmentInfo.partName);

                        if(attachmentFile.size == 0) {
                            throw new Error(messenger.i18n.getMessage("missingAttachment"));
                        }

                        attachmentInfo.size = attachmentFile.size;
                    }
                    catch(e) {
                        alterationMap.set(attachmentInfo.partName, {
                            name: attachment.name,
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

                folderStats.lastFileName = attachment.name;

                this.#attachmentCount++;
                folderStats.attachmentCount++;

                this.#cumulativeAttachmentSize += attachmentInfo.size;
                folderStats.attachmentSize += attachmentInfo.size;
            }

            if(alterationMap.size > 0) {
                this.#alterationTracker.push(...alterationMap.values());
            }

            this.#attachmentMessageCount++;
            folderStats.attachmentMessageCount++;
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
                fullMessage
            } = identifyAttachmentsResult;

            if(!fullMessage) {
                fullMessage = await messenger.messages.getFull(message.id);
            }

            if(fullMessage.parts) {
                const embeds = EmbedManager.identifyEmbeds(message.id, message.date, fullMessage.parts);

                if(embeds.length > 0) {
                    let messageCharset = null;

                    if(!this.#useAdvancedGetRaw) {
                        const identifyMessageCharsetResult = this.#identifyMessageCharset(fullMessage.parts);

                        messageCharset = identifyMessageCharsetResult.charset;
                    }

                    for(const embed of embeds) {
                        embed.charset = messageCharset;
                    }

                    this.attachmentList.push(...embeds);

                    folderStats.lastFileName = embeds[0].name;

                    this.#embedCount+= embeds.length;
                    folderStats.embedCount += embeds.length;

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

            if(part.headers && part.headers["x-mozilla-altered"]) {
                const alterationTokens = part.headers["x-mozilla-altered"][0].split(";");
                
                let alteration = "unknown";
                let timestamp = null;
                let fileUrl = null;

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

                alterationMap.set(part.partName, {
                    name: part.partName,
                    alteration: alteration,
                    author: message.author,
                    subject: message.subject,
                    date: message.date,
                    timestamp: timestamp,
                    fileUrl: fileUrl
                });
            }
            else if(part.contentType == "text/x-moz-deleted") {
                const deletionEntry = {
                    name: part.partName,
                    alteration: "deleted",
                    author: message.author,
                    subject: message.subject,
                    date: message.date,
                    timestamp: null,
                    fileUrl: null
                };

                alterationMap.set(part.partName, deletionEntry);

                this.#log(deletionEntry);
            }

            if(part.parts) {
                this.#generateAlterationMap(part.parts, alterationMap);
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
        this.#duplicateFileNameTracker = null;
        this.#duplicateEmbedFileTracker = null;
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
            includeEmbeds
        } = extractOptions;

        const packagingProgressInfo = {
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

            filesCreated: 0,
            fileCount: 0,

            lastFileName: ""
        };

        this.#reportPackagingProgress(packagingProgressInfo);

        packagingProgressInfo.status = "preparing";

        const selectedItemKeys = new Set(list.map((item) => {
            const info = getInfo(item);

            return `${info.messageId}:${info.partName}`;
        }));

        this.#packagingTracker = {
            items: [],
            extractionSubsets: [],
            currentPackageIndex: 0,
            embedItems: [],
            currentEmbedMessageIndex: 0,
            totalEmbedMessageCount: 0,
            preserveFolderStructure: preserveFolderStructure
        };

        this.#packagingFilenameList = [];

        const packagingTracker = this.#packagingTracker;

        const items = packagingTracker.items;
        const embedItems = packagingTracker.embedItems;

        this.#duplicateFileTracker = [];

        const duplicateKeys = new Set();

        let cumulativeSize = 0;

        // Segregate embedded/inline imags, determine selected items and identify/isolate attachment duplicates

        const useFilenamePattern = this.#useFilenamePattern;
        const omitDuplicates = this.#omitDuplicates;

        for(const item of this.attachmentList) {
            if(selectedItemKeys.has(`${item.messageId}:${item.partName}`)) {
                if(item.isEmbed) {
                    if(includeEmbeds) {
                        embedItems.push(item);
                    }
                }
                else {
                    let fileName = item.name;

                    if(useFilenamePattern) {
                        fileName = this.#generateAlternateFilename(item);
                        item.alternateFilename = fileName;
                    }
        
                    const duplicateKey = `${fileName}:${item.size}`;

                    if(!(omitDuplicates && duplicateKeys.has(duplicateKey))) {
                        item.isDeleted = false;
                        items.push(item);
                        
                        if(omitDuplicates) {
                            duplicateKeys.add(duplicateKey);
                        }
                        
                        cumulativeSize += item.size;
                    }
                    else {
                        this.#duplicateFileTracker.push({ messageId: item.messageId, partName: item.partName, name: fileName, size: item.size, isDeleted: false });

                        packagingProgressInfo.duplicateCount++;
                        packagingProgressInfo.duplicateTotalBytes += item.size;

                        this.#reportPackagingProgress(packagingProgressInfo);
                    }
                }
            }
        }

        // Determine packaging sets

        items.sort((a, b) => a.size - b.size);

        const maxSize = 750000000;
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

        packagingProgressInfo.fileCount = packagingTracker.extractionSubsets.length;
        
        if(embedItems.length > 0 && items.length > 0) {
            packagingProgressInfo.fileCount++;
        }

        packagingProgressInfo.totalItems = items.length;
        packagingProgressInfo.totalEmbedItems = embedItems.length;

        // Begin Packaging phase...
        packagingProgressInfo.status = "prepackaging";

        this.#reportPackagingProgress(packagingProgressInfo);

        this.#packagingErrorList = [];

        this.#duplicateFileNameTracker = new Map();

        if(embedItems.length > 0) {
            this.#duplicateEmbedFileTracker = new Map();

            if(items.length == 0) {                                 // The rare case where there are only embeds...
                packagingTracker.currentPackageIndex = 1;           // Bit of a hack; should reconsider how this is handled
                this.#packageEmbeds(packagingProgressInfo);
                return;
            }
        }

        this.#package(packagingProgressInfo);        
    }

    async #package(packagingProgressInfo) {
        const zipEm = new ZipEm();

        const packagingTracker = this.#packagingTracker;
        const errorList = this.#packagingErrorList;
        const currentPackageIndex = packagingTracker.currentPackageIndex;

        let start = (currentPackageIndex == 0) ? 0 : packagingTracker.extractionSubsets[currentPackageIndex - 1];
        let nextStart = packagingTracker.extractionSubsets[currentPackageIndex];

        packagingProgressInfo.status = "packaging";

        this.#reportPackagingProgress(packagingProgressInfo);

        for (let i = start; i < nextStart; i++) {
            const item = packagingTracker.items[i];

            item.hasError = false;

            let attachmentFile;

            try {
                this.#log(`Packaging - get attachment file: ${item.name}`);

                attachmentFile = await this.#getAttachmentFile(item.messageId, item.partName);

                if(attachmentFile.size == 0) {
                    throw new Error(messenger.i18n.getMessage("missingAttachment"));
                }
            }
            catch(e) {
                item.hasError = true;

                errorList.push({
                    messageId: item.messageId,
                    name: item.name,
                    size: item.size,
                    scope: "getFileData",
                    error: e.toString()
                });

                packagingProgressInfo.errorCount = errorList.length;

                this.#reportPackagingProgress(packagingProgressInfo);

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

            let fileName = (item.alternateFilename) ? item.alternateFilename : item.name;

            packagingProgressInfo.lastFileName = fileName;
            
            const duplicateFileNameTracker = this.#duplicateFileNameTracker;

            const duplicateKey = fileName.toLowerCase();

            if(duplicateFileNameTracker.has(duplicateKey)) {
                let sequenceNumber = duplicateFileNameTracker.get(duplicateKey);

                fileName = this.#sequentializeFileName(fileName, ++sequenceNumber);

                item.alternateFilename = fileName;

                duplicateFileNameTracker.set(duplicateKey, sequenceNumber);
            }
            else {
                duplicateFileNameTracker.set(duplicateKey, 1);
            }

            if(packagingTracker.preserveFolderStructure) {
                const message = this.messageList.get(item.messageId);
                fileName = `${message.folderPath.slice(1)}/${fileName}`;
            }

            try {
                this.#log(`Packaging - add file to zip buffer: ${item.name}`);

                await zipEm.addFile(fileName, attachmentFile, item.date);

                packagingProgressInfo.includedCount++;
                packagingProgressInfo.totalBytes += item.size;

                item.packagingFilenameIndex = this.#packagingFilenameList.length;
            }
            catch(e) {
                item.hasError = true;

                errorList.push({
                    messageId: item.messageId,
                    name: item.name,
                    size: item.size,
                    scope: "addToZip",
                    error: e.toString()
                });

                packagingProgressInfo.errorCount = errorList.length;

                this.#log(e, true);
            }

            this.#reportPackagingProgress(packagingProgressInfo);
        }

        packagingProgressInfo.lastFileName = "...";

        packagingTracker.currentPackageIndex++;

        await this.#prepareDownload(zipEm, packagingProgressInfo);
    }

    async #packageEmbeds(packagingProgressInfo) {
        const zipEm = new ZipEm();
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
            else
            {
                groupedEmbedItems.set(messageId, [item]);
            }
        }

        groupedEmbedItems = [...groupedEmbedItems.entries()];

        if(packagingTracker.totalEmbedMessageCount == 0) {
            packagingTracker.totalEmbedMessageCount = groupedEmbedItems.length;
        }
        else {
            packagingProgressInfo.fileCount++;
        }

        const maxSize = 750000000;
        let currentSize = 0;

        for(let i = packagingTracker.currentEmbedMessageIndex; i < groupedEmbedItems.length; i++) {
            const messageItems = groupedEmbedItems[i];

            const messageId = messageItems[0];
            const messageEmbedItems = messageItems[1];
            const messageCharset = messageEmbedItems[0].charset;

            await EmbedManager.extractEmbeds(messageId, messageEmbedItems, messageCharset);

            currentSize += messageEmbedItems.reduce((sum, item) => sum + item.size, 0);

            if(currentSize > maxSize) {
                packagingTracker.currentEmbedMessageIndex = i;

                break;
            }

            for(const item of messageEmbedItems) {
                if(item.error) {
                    item.hasError = true;

                    errorList.push({
                        messageId: item.messageId,
                        name: item.name,
                        size: item.size,
                        scope: "extractEmbeds",
                        error: item.error
                    });

                    const message = this.messageList.get(item.messageId);

                    this.#log(`Embed error: ${message.author} ${message.folderPath} - ${item.date} :${item.error}`, true);

                    packagingProgressInfo.errorCount = errorList.length;

                    this.#reportPackagingProgress(packagingProgressInfo);
                    continue;
                }

                let fileName = item.name;

                const decodeData = item.decodeData;

                if(duplicateEmbedFileTracker.has(fileName)) {
                    let sequenceNumber = 0;
                    const nameDuplicate = duplicateEmbedFileTracker.get(fileName);

                    if(nameDuplicate.sizes.has(item.size)) {
                        const sizeDuplicate = nameDuplicate.sizes.get(item.size);

                        if(sizeDuplicate.has(decodeData.checksum)) {
                            const checksumDuplicate = sizeDuplicate.get(decodeData.checksum);

                            checksumDuplicate.push(item.messageId);
                            item.isDuplicate = true;

                            packagingProgressInfo.duplicateEmbedCount++;
                            packagingProgressInfo.duplicateTotalBytes += item.size;

                            this.#reportPackagingProgress(packagingProgressInfo);
                            continue;
                        }
                        else {
                            sequenceNumber = nameDuplicate.count++;
                            sizeDuplicate.set(decodeData.checksum, []);
                        }
                    }
                    else {
                        sequenceNumber = nameDuplicate.count++;
                        nameDuplicate.sizes.set(item.size, new Map([[decodeData.checksum, []]]));
                    }

                    if(this.#useFilenamePattern) {
                        fileName = this.#generateAlternateFilename(item);
                        item.alternateFilename = fileName;
                    }

                    if(sequenceNumber > 0) {
                        fileName = this.#sequentializeFileName(fileName, sequenceNumber);

                        item.alternateFilename = fileName;
                    }
                }
                else {
                    const checksumEntry = new Map([[decodeData.checksum, []]]);
                    duplicateEmbedFileTracker.set(fileName, { count: 1, sizes: new Map([[item.size, checksumEntry]]) });

                    if(this.#useFilenamePattern) {
                        fileName = this.#generateAlternateFilename(item);
                        item.alternateFilename = fileName;
                    }
                }

                packagingProgressInfo.lastFileName = fileName;
    
                if(packagingTracker.preserveFolderStructure) {
                    const message = this.messageList.get(item.messageId);
                    fileName = `${message.folderPath.slice(1)}/${fileName}`;
                }

                try {
                    await zipEm.addFile(fileName, new Blob([decodeData.data]), item.date);

                    packagingProgressInfo.totalEmbedBytes += decodeData.data.length;
                    packagingProgressInfo.includedEmbedCount++;

                    item.packagingFilenameIndex = this.#packagingFilenameList.length;
                }
                catch(e) {
                    item.hasError = true;

                    errorList.push({
                        messageId: item.messageId,
                        name: item.name,
                        size: item.size,
                        scope: "packageEmbeds",
                        error: `${e}`
                    });

                    packagingProgressInfo.errorCount = errorList.length;
                }
                finally {
                    item.decodeData = null;
                }
            }

            this.#reportPackagingProgress(packagingProgressInfo);

            packagingTracker.currentEmbedMessageIndex = i + 1;
        }

        packagingProgressInfo.lastFileName = "...";

        this.#prepareDownload(zipEm, packagingProgressInfo, "embeds");
    }

    async #prepareDownload(zipEm, packagingProgressInfo, disposition = "attachments") {
        let zipFile;

        try {
            zipFile = await zipEm.complete();
        }
        catch(e) {
            this.#log(e, true);

            return;
        }

        const zipParams = {
            url: URL.createObjectURL(zipFile),
            filename: `${messenger.i18n.getMessage(disposition)}-${new Date().getTime()}.zip`,
            conflictAction: "uniquify"
        };

        this.#download(zipParams, packagingProgressInfo);
    }


    async #download(zipParams, packagingProgressInfo) {
        let downloadId = null;

        const packagingTracker = this.#packagingTracker;
        const isFirst = (packagingTracker.currentPackageIndex == 1);
        const isFinal = (packagingTracker.currentPackageIndex == packagingTracker.extractionSubsets.length);
        const hasEmbeds = (this.#packagingTracker.embedItems.length > 0);
        const isEmbedFinal = (packagingTracker.totalEmbedMessageCount > 0 && packagingTracker.currentEmbedMessageIndex == packagingTracker.totalEmbedMessageCount);

        packagingProgressInfo.status = "downloading";
        this.#reportPackagingProgress(packagingProgressInfo);

        const removeHandlers = () =>
        {
            browser.downloads.onChanged.removeListener(handleChanged);
            browser.downloads.onCreated.removeListener(handleCreated);
        };

        const handleChanged = (progress) =>
        {
            if(progress.id == downloadId && progress.state) {
                let info = null;
                let success = false;

                if(progress.state.current == "complete") {
                    info = {
                        status: "success",
                        message: messenger.i18n.getMessage("saveComplete"),
                        attachmentCount: packagingTracker.items.length
                    };

                    packagingProgressInfo.filesCreated++;
                    this.#reportPackagingProgress(packagingProgressInfo);

                    success = true;
                }
                else if(progress.state.current  == "interrupted") {
                    info = {
                        status: "error",
                        message: (progress.error) ? progress.error : messenger.i18n.getMessage("saveFailed")
                    };
                }

                if(info) {
                    if(isFinal && (!hasEmbeds || isEmbedFinal)) {
                        this.#reportSaveResult(info);
                    }

                    removeHandlers();

                    this.#log(`Removing download data (${info.status})`);

                    URL.revokeObjectURL(zipParams.url);

                    if(success) {
                        if(!isFinal) {
                            this.#package(packagingProgressInfo);       // Package the next set of attachments
                        }
                        else if(hasEmbeds && !isEmbedFinal) {
                            this.#packageEmbeds(packagingProgressInfo);
                        }
                    }
                }
            }
        };

        const handleCreated = ((downloadItem) =>
        {
            if(downloadItem.url == zipParams.url) {
                this.#packagingFilenameList.push(downloadItem.filename);
            }
        });

        browser.downloads.onChanged.addListener(handleChanged);
        browser.downloads.onCreated.addListener(handleCreated);

        browser.downloads
            .download(zipParams)
            .then(
                (id) => {
                    downloadId = id;

                    if(isFirst) {
                        this.#reportSaveResult({ status: "started" });
                    }
                },
                (error) => {
                    this.#reportSaveResult({
                        status: "error",
                        message: error.message
                    });

                    removeHandlers();

                    this.#log("Removing download data (error)");

                    URL.revokeObjectURL(zipParams.url);
                }
            );
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

        const deletionSets = [packagedItems, duplicateItems];

        this.#detachmentErrorList = [];

        for(const set of deletionSets) {
            for(const item of set) {
                const { messageId, partName, name, size } = item;

                info.lastFileName = name;

                const message = this.messageList.get(messageId);

                this.#log(`Begin detach: ${message.author} ~ ${message.date} : ${name}`);

                try {
                    await messenger.messages.deleteAttachments(messageId, [partName]);

                    this.#log(`End detach: ${message.author} ~ ${message.date} : ${name}`);

                    item.isDeleted = true;
                    info.processedCount++;
                }
                catch(e) {
                    this.#detachmentErrorList.push({
                        messageId: messageId,
                        name: name,
                        size: size,
                        scope: "detach",
                        error: e.toString()
                    });
                    
                    info.errorCount++;

                    this.#log(e, true);
                }

                this.#reportDetachProgress(info);
            }
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
        
        let originalFilename = item.name;
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
            result = result.replace("{subject}", message.subject);
        }

        if(result.indexOf("{filename}") > -1) {
            let extension = "";

            const segments = originalFilename.split(".");

            if (segments.length > 1) {
                if (segments[segments.length - 1].length < 6) {
                    extension = "." + segments.pop();
                    originalFilename = segments.join('.');
                }
            }

            result = result.replace("{filename}", originalFilename) + extension;
        }

        if(result != this.#filenamePattern) {
            result = this.#normalizeFileName(result);
        }
        else {
            result = item.name;
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
            mm: date.getMonth().toString().padStart(2, "0"),
            dd: date.getDay().toString().padStart(2, "0")
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

    #normalizeFileName(originalFileName) {
        const windowsForbiddenCharacterRegex = /[<>:"|?*\/\\]/g;

        let result = originalFileName.trim().split(";")[0];

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

    #sequentializeFileName(fileName, sequenceNumber) {
        const paddedSequenceNumber = sequenceNumber.toString().padStart(3, "0");

        const tokens = fileName.split(".");

        tokens[0] = `${tokens[0]}_${paddedSequenceNumber}`;

        const result = tokens.join(".");

        return result;
    }

    #log(message, condition = this.#useEnhancedLogging) {
        if(condition) {
            console.log(message);
        }
    }
}