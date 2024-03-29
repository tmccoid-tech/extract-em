import { ZipEm } from "/module/zipem.js";

export class AttachmentManager {
    #platformOs;

    #folders;

    #folderCount = 0;
    #processedFolderCount = 0;
    #processedMessageCount = 0;
    #attachmentMessageCount = 0;
    #attachmentCount = 0;
    #cumulativeAttachmentSize = 0;

    #reportFolderProcessing = (folderPath) => {};
    #reportMessageStats = (folderStats) => {};
    #reportAttachmentStats = (folderStats) => {};
    #reportFolderProcessed = (folderPath) => {};
    #reportProcessingComplete = () => {};

    #reportPreparationProgress = (info) => {};

    #reportPackagingProgress = (info) => {};
    #reportSaveResult;

    #packagingTracker;
    #packagingErrorList;

    #duplicateFileTracker;
    #duplicateFileNameTracker;

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

            this.#reportPreparationProgress = options.reportPreparationProgress;

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
            attachmentSize: 0,
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
                summaryAttachmentSize: this.#cumulativeAttachmentSize,
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

                    this.#cumulativeAttachmentSize += attachmentInfo.size;
                    folderStats.attachmentSize += attachmentInfo.size;
                }
            }

            if(!isNested) {
                this.#attachmentMessageCount++;
                folderStats.attachmentMessageCount++;

                this.#reportAttachmentStats({
                    summaryProcessedMessageCount: this.#processedMessageCount,
                    summaryAttachmentMessageCount: this.#attachmentMessageCount,
                    summaryAttachmentCount: this.#attachmentCount,
                    summaryAttachmentSize: this.#cumulativeAttachmentSize,
                    folderPath: folderStats.folderPath,
                    attachmentMessageCount: folderStats.attachmentMessageCount,
                    attachmentCount: folderStats.attachmentCount,
                    attachmentSize: folderStats.attachmentSize,
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
        this.#cumulativeAttachmentSize = 0;

        this.#selectedFolderPaths = undefined;

        this.#packagingTracker = null;
        this.#packagingErrorList = null;
        this.#duplicateFileTracker = null;
        this.#duplicateFileNameTracker = null;

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
        // Preparation phase

        const preparationProgressInfo = {
            status: "started",
            duplicateCount: 0
        }

        this.#reportPreparationProgress(preparationProgressInfo);

        preparationProgressInfo.status = "executing";

        const selectedItemKeys = new Set(list.map((item) => {
            const info = getInfo(item);

            return `${info.messageId}:${info.partName}`;
        }));

        this.#packagingTracker = {
            items: [],
            extractionSubsets: [],
            currentPackageIndex: 0,
            preserveFolderStructure: extractOptions.preserveFolderStructure
        };

        const items = this.#packagingTracker.items;

        this.#duplicateFileTracker = [];

        const duplicateKeys = new Set();

        let cumulativeSize = 0;

        // Determine selected items and identify/isolate duplicates

        for(const item of this.attachmentList) {
            if(selectedItemKeys.has(`${item.messageId}:${item.partName}`)) {
                const duplicateKey = `${item.name}${item.size}`;

                if(!duplicateKeys.has(duplicateKey)) {
                    items.push(item);
                    duplicateKeys.add(duplicateKey);
                    cumulativeSize += item.size;
                }
                else {
                    this.#duplicateFileTracker.push({ messageId: item.messageId, partName: item.partName});

                    preparationProgressInfo.duplicateCount++;

                    this.#reportPreparationProgress(preparationProgressInfo);
                }
            }
        }

        // Determine packaging sets

        items.sort((a, b) => a.size - b.size);

        const maxSize = 750000000;
//        const maxSize = 250000000;
        let currentSize = 0;
        let currentStart = 0;

        const extractionSubsets = this.#packagingTracker.extractionSubsets;

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

        preparationProgressInfo.status = "complete";

        this.#reportPreparationProgress(preparationProgressInfo);


        // Begin Packaging phase...

        const packagingProgressInfo = {
            status: "started",
            totalItems: items.length,
            includedCount: 0,
            errorCount: 0,
            totalBytes: 0,
//            hasDuplicate: false,
            filesCreated: 0,
            fileCount: this.#packagingTracker.extractionSubsets.length,
            lastFileName: ""
        };

        this.#reportPackagingProgress(packagingProgressInfo);

        this.#packagingErrorList = [];

        this.#duplicateFileNameTracker = new Map();

        this.#package(packagingProgressInfo);        
    }

    async #package(packagingProgressInfo) {
//        const jsZip = JSZip();
//        const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"), { bufferedWrite: true, useCompressionStream: false });
        const zipEm = new ZipEm(true);

        const packagingTracker = this.#packagingTracker;
        const errorList = this.#packagingErrorList
        const currentPackageIndex = packagingTracker.currentPackageIndex;

        let start = (currentPackageIndex == 0) ? 0 : packagingTracker.extractionSubsets[currentPackageIndex - 1];
        let nextStart = packagingTracker.extractionSubsets[currentPackageIndex];

        packagingProgressInfo.status = "executing";

        this.#reportPackagingProgress(packagingProgressInfo);

        for (let i = start; i < nextStart; i++) {
            const item = packagingTracker.items[i];

            let attachmentFile;

            try {
                attachmentFile = await this.#getAttachmentFile(item.messageId, item.partName);
            }
            catch(e) {
                errorList.push({
                    messageId: item.messageId,
                    partName: item.partName,
                    scope: "getFileData",
                    error: e.toString()
                });

                packagingProgressInfo.errorCount = errorList.length;

                console.log(e);

                this.#reportPackagingProgress(packagingProgressInfo);

                continue;
            }

            let fileName = item.name;
            packagingProgressInfo.lastFileName = fileName;
            
            const duplicateFileNameTracker = this.#duplicateFileNameTracker;

            const duplicateKey = fileName.toLowerCase();

            if(duplicateFileNameTracker.has(duplicateKey)) {
                let sequenceNumber = duplicateFileNameTracker.get(duplicateKey);

                fileName = this.#sequentializeFileName(fileName, ++sequenceNumber);

                duplicateFileNameTracker.set(duplicateKey, sequenceNumber);
            }
            else {
                duplicateFileNameTracker.set(duplicateKey, 1);
            }

            if(packagingTracker.preserveFolderStructure) {
                const message = this.messageList.get(item.messageId);
                fileName = `${message.folderPath.slice(1)}/${fileName}`;
            }

//            jsZip.file(fileName, attachmentFile, { date: item.date });

//            await zipWriter.add(fileName, new zip.BlobReader(attachmentFile), { creationDate: item.date, useWebWorkers: true });

            try {
                await zipEm.add(fileName, attachmentFile, item.date);

                packagingProgressInfo.includedCount++;
                packagingProgressInfo.totalBytes += item.size;
            }
            catch(e) {
                errorList.push({
                    messageId: item.messageId,
                    partName: item.partName,
                    scope: "addToZip",
                    error: e.toString()
                });

                packagingProgressInfo.errorCount = errorList.length;

                console.log(e);
            }

            this.#reportPackagingProgress(packagingProgressInfo);
        }

        packagingProgressInfo.lastFileName = "...";

        let zipFile;

        try {
//          zipFile = await jsZip.generateAsync({ type: "blob" });

//          zipFile = await zipWriter.close();

            zipFile = await zipEm.complete();
        }
        catch(e) {
            console.log(e);

            return;
        }

        const zipParams = {
            url: URL.createObjectURL(zipFile),
            filename: `${messenger.i18n.getMessage("attachments")}-${new Date().getTime()}.zip`,
            conflictAction: "uniquify"
        };

        this.#download(zipParams, packagingProgressInfo);
    }

    async #download(zipParams, packagingProgressInfo) {
        let downloadId = null;

        const packagingTracker = this.#packagingTracker;
        const isFirst = (++packagingTracker.currentPackageIndex == 1);
        const isFinal = (packagingTracker.currentPackageIndex == packagingTracker.extractionSubsets.length);

        packagingProgressInfo.status = "donwloading";
        this.#reportPackagingProgress(packagingProgressInfo);

        const listen = (progress) =>
        {
            if(progress.id == downloadId && progress.state) {
                let info = null;
                let success = false;

                if(progress.state.current == "complete") {
                    info = {
                        status: "success",
                        message: messenger.i18n.getMessage("saveComplete"),
                        attachmentCount: "NOT IMPLEMENTED"                    //deletionTracker.attachmentCount
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
                    if(isFinal) {
                        this.#reportSaveResult(info);
                    }

                    browser.downloads.onChanged.removeListener(listen);
        
                    URL.revokeObjectURL(zipParams.url);

                    if(success && !isFinal) {
                        this.#package(packagingProgressInfo);       // Package the next set of attachments
                    }
                }
            }
        };

        browser.downloads.onChanged.addListener(listen);

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

                    browser.downloads.onChanged.removeListener(listen);

                    URL.revokeObjectURL(zipParams.url);
                }
            );
    }


    deleteAttachments() {
        const info = {
            processedCount: 0,
            lastFileName: "..."
        };

        let success = true;

        const deletionSets = [this.#packagingTracker.items, this.#duplicateFileTracker];

        for(const set of deletionSets) {
            for(const item of set) {
                console.log(`${item.messageId} : ${item.partName} - ${item.name}`);

                try {
//                        messenger.messages.deleteAttachments(messageId, partName);
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