export class AttachmentManager {
    #platformOs;

    #folders;

    #folderCount = 0;
    #processedFolderCount = 0;
    #processedMessageCount = 0;
    #attachmentMessageCount = 0;
    #attachmentCount = 0;

    #reportFolderProcessing = (folderPath) => {};
    #reportMessageStats = (folderStats) => {};
    #reportAttachmentStats = (folderStats) => {};
    #reportFolderProcessed = (folderPath) => {};
    #reportProcessingComplete = () => {};

    #reportPackagingProgress = (info) => {};
    #reportSaveResult;

    #deletionTracker
    #reportDetachProgress = (info) => {};
    #reportDetachResult = (info) => {};


    #selectedFolderPaths;

    attachmentList = [];
    messageList = new Map();

    #groupingSet = new Map();

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


    #windowsForbiddenCharacterRegex = /[<>:"|?*\/\\]/g;

    constructor(options) {
        this.#folders = options.folders;

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
    }

    #onFolderProcessed(folderPath) {
        this.#reportFolderProcessed(folderPath);
        this.#processedFolderCount++;

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

        for (const folder of this.#folders) {
            const folderSummaryInfo = await this.#queryFolder(folder, includeSubfolders, result);
            result.folders.push(folderSummaryInfo);
        }

        return result;
    }

    async #queryFolder(folder, includeSubfolders, summary) {
        summary.folderCount++;
        this.#folderCount++;

        const folderInfo = await messenger.folders.getFolderInfo(folder);

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

    async discoverAttachments(selectedFolderPaths) {
        this.#selectedFolderPaths = selectedFolderPaths;

        for (const folder of this.#folders) {
            this.#processFolder(folder);
        }
    }

    async #processFolder(folder) {
        if (this.#selectedFolderPaths.has(folder.path)) {
            this.#processPages(folder);
        }

        for (const subFolder of folder.subFolders) {
            this.#processFolder(subFolder);
        }
    }

    async #processPages(folder) {
        let page = await messenger.messages.list(folder);

        const folderStats = {
            folderPath: folder.path,
            processedMessageCount: 0,
            attachmentMessageCount: 0,
            attachmentCount: 0,
            lastFileName: ""
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
                folderPath: folderStats.folderPath,
                processedMessageCount: folderStats.processedMessageCount
            });
        }
    }

    async #processMessage(message, folderStats, isNested = false) {
        const messageAttachmentList = await messenger.messages.listAttachments(message.id);

        const hasAttachments = (messageAttachmentList.length > 0);

        if (messageAttachmentList.length > 0) {
            if (!this.messageList.has(message.id)) {
                this.messageList.set(message.id, {
                    author: message.author,
                    subject: message.subject,
                    folderPath: folderStats.folderPath
                });
            }

            for (const attachment of messageAttachmentList) {
                let hasNestedAttachments = false;

                if(attachment.message) {
                    const nestedMessage = await messenger.messages.get(attachment.message.id);

                    hasNestedAttachments = await this.#processMessage(nestedMessage, folderStats, true);
                }

                if(!hasNestedAttachments) {
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
                        date: message.date,
                        partName: attachment.partName,
                        contentType: attachment.contentType,
                        size: attachment.size,
                        extension: extension,
                        isPreviewable: this.#previewSet.has(extension)
                    };

                    if(attachmentInfo.size < 1) {
                        const attachmentFile = await this.#getAttachmentFile(attachmentInfo.messageId, attachmentInfo.partName);

                        attachmentInfo.size = attachmentFile.size;
                    }

                    this.attachmentList.push(attachmentInfo);

                    folderStats.lastFileName = attachment.name;

                    this.#attachmentCount++;
                    folderStats.attachmentCount++;
                }
            }

            if(!isNested) {
                this.#attachmentMessageCount++;
                folderStats.attachmentMessageCount++;

                this.#reportAttachmentStats({
                    summaryProcessedMessageCount: this.#processedMessageCount,
                    summaryAttachmentMessageCount: this.#attachmentMessageCount,
                    summaryAttachmentCount: this.#attachmentCount,
                    folderPath: folderStats.folderPath,
                    attachmentMessageCount: folderStats.attachmentMessageCount,
                    attachmentCount: folderStats.attachmentCount,
                    lastFileName: folderStats.lastFileName
                });
            }
        }

        return hasAttachments;
    }

    reset() {
        this.#folderCount = 0;
        this.#processedFolderCount = 0;
        this.#processedMessageCount = 0;
        this.#attachmentMessageCount = 0;
        this.#attachmentCount = 0;

        this.#selectedFolderPaths = undefined;

        this.#deletionTracker = null;

        this.attachmentList.length = 0;
        this.messageList.clear();
    
        this.#groupingSet.clear();
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

    async extract(list, getInfo, extractOptions) {
        const packagingProgressInfo = {
            totalItems: list.length,
            includedCount: 0,
            skippedCount: 0,
            totalBytes: 0,
            hasDuplicate: false,
            lastFileName: ""
        };

        this.#reportPackagingProgress(packagingProgressInfo);

        const sizeRegistration = new Map(this.attachmentList.map((item) => [`${item.messageId}:${item.partName}`, item.size]));

        let cumulativeSize = 0;

        const extractionSet = list
            .map((item) => {
                const info = getInfo(item);

                const size = sizeRegistration.get(`${item.messageId}:${item.partName}`);

                cumulativeSize += size;

                return {
                    messageId: info.messageId,
                    partName: info.partName,
                    size: size,
                    timestamp: info.timestamp
                }
            })
            .sort((a, b) => b.size - a.size);

        
        const extractionSubsets = [];
        const maxSize = 750000000;

        if(cumulativeSize > maxSize) {
            let currentSize = 0;
            let currentStart = 0;

            for(const item of extractionSet) {
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

        extractionSubsets.push(extractionSet.length);

        const duplicateTracker = new Map();
        this.#deletionTracker = {
            attachmentCount: 0,
            items: new Map()
        };

        const deletionTracker = this.#deletionTracker;

        let subsetIndex = 0;
        let start = 0;

        while(subsetIndex < extractionSubsets.length) {
            let nextStart = extractionSubsets[subsetIndex];

            const success = await this.#package(extractionSet, start, nextStart, extractOptions, packagingProgressInfo, duplicateTracker, deletionMap, (extractionSubsets.length == subsetIndex + 1));

            if(!success) {
                this.#reportSaveResult({
                    status: "error",
                    message: messenger.i18n.getMessage("saveFailed")
                });

                return;
            }

            start = nextStart;

            subsetIndex++;
        }
    }

    async #package(extractionSet, start, nextStart, extractOptions, packagingProgressInfo, duplicateTracker, deletionMap, isFinal) {
        const jsZip = JSZip();

        for (let i = start; i < nextStart; i++) {
            const info = extractionSet[i];

            let attachmentFile;

            try {
                attachmentFile = await this.#getAttachmentFile(info.messageId, info.partName);
            }
            catch(e) {
                console.log(e);
                continue;
            }

            let fileName = this.#normalizeFileName(attachmentFile.name);
            packagingProgressInfo.lastFileName = attachmentFile.name;
            const size = attachmentFile.size;

            deletionTracker.attachmentCount++;

            const attachmentInfo = { partName: info.partName, fileName: attachmentFile.name };

            if(deletionTracker.items.has(info.messageId)) {
                deletionTracker.items.get(info.messageId).push(attachmentInfo);
            }
            else {
                deletionTracker.items.set(info.messageId, [attachmentInfo]);
            }

            const duplicateKey = fileName.toLowerCase();

            if(duplicateTracker.has(duplicateKey)) {
                const duplicateSet = duplicateTracker.get(duplicateKey);

                if(duplicateSet.has(size)) {
                    packagingProgressInfo.totalItems--;
                    packagingProgressInfo.skippedCount++;
                    packagingProgressInfo.hasDuplicate = true;

                    this.#reportPackagingProgress(packagingProgressInfo);

                    packagingProgressInfo.hasDuplicate = false;

                    continue;
                }

                duplicateSet.add(size);

                const sequenceNumber = duplicateSet.size;

                fileName = this.#sequentializeFileName(fileName, sequenceNumber);
            }
            else {
                duplicateTracker.set(duplicateKey, new Set([size]));
            }

            packagingProgressInfo.includedCount++;
            packagingProgressInfo.totalBytes += attachmentFile.size;

            if(extractOptions.preserveFolderStructure) {
                const message = this.messageList.get(info.messageId);
                fileName = `${message.folderPath.slice(1)}/${fileName}`;
            }

            const fileData = await attachmentFile.arrayBuffer();
            jsZip.file(fileName, fileData, { date: info.timestamp });

            this.#reportPackagingProgress(packagingProgressInfo);
        }

        packagingProgressInfo.lastFileName = "...";
        this.#reportPackagingProgress(packagingProgressInfo);

        let zipFile;

        try {
            zipFile = await jsZip.generateAsync({ type: "blob" });
        }
        catch(e) {
            console.log(e);

            return false;
        }

        let downloadId = null;

        const zipParams = {
            url: URL.createObjectURL(zipFile),
            filename: `${messenger.i18n.getMessage("attachments")}-${new Date().getTime()}.zip`,
            conflictAction: "uniquify"
        };

        const listen = (progress) =>
        {
            if(progress.id == downloadId && progress.state) {
                let info = null;

                if(progress.state.current == "complete") {
                    info = {
                        status: "success",
                        message: messenger.i18n.getMessage("saveComplete"),
                        attachmentCount: deletionTracker.attachmentCount
                    };
                }
                else if(progress.state.current  == "interrupted") {
                    info = {
                        status: "error",
                        message: (progress.error) ? progress.error : messenger.i18n.getMessage("saveFailed")
                    };
                }

                if(info) {
                    if(isFinal) {
                        this.#reportSaveResult(info);
                    }

                    browser.downloads.onChanged.removeListener(listen);
        
                    URL.revokeObjectURL(zipParams.url);
                }
            }
        };

        browser.downloads.onChanged.addListener(listen);

        browser.downloads
            .download(zipParams)
            .then(
                (id) => {
                    downloadId = id;
                    if(isFinal) {
                        this.#reportSaveResult({ status: "started" });
                    }
                },
                (error) => {
                    if(isFinal) {
                        this.#reportSaveResult({
                            status: "error",
                            message: error.message
                        });
                    }

                    browser.downloads.onChanged.removeListener(listen);

                    URL.revokeObjectURL(zipParams.url);
                }
            );

        return true;
    }


    deleteAttachments() {
        const info = {
            processedCount: 0,
            lastFileName: "..."
        };

        let success = true;

        for(const item of this.#deletionTracker.items) {
            const messageId = item[0];
            const attachments = item[1];

            for(const attachmentInfo of attachments) {

                console.log(`${messageId} : ${attachmentInfo.partName} - ${attachmentInfo.fileName}`);

                try {
                    messenger.messages.deleteAttachments(messageId, attachmentInfo);
                    info.processedCount++;
                }
                catch(e) {
                    success = false;
                }
            }

            this.#reportDetachProgress(info);
        }

        this.#reportDetachResult({ success: success });
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

    #normalizeFileName(originalFileName) {
        let result = originalFileName.trim().split(";")[0];

        switch (this.#platformOs) {
            case "win":
                result = result.replace(this.#windowsForbiddenCharacterRegex, "_");

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
}