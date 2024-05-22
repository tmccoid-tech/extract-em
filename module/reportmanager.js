export class ReportManager {
    static async generateReport(attachmentManager, parameters) {
        const {
            reportStyleTemplate,
            reportTemplate,
            reportItemTemplate,
            abbreviateFileSize,
        } = parameters;

        const namespace = "http://www.w3.org/1999/xhtml";
        const reportDocument = document.implementation.createDocument(namespace, "html", null);

        const reportHead = document.createElementNS(namespace, "head");
        const reportBody = document.createElementNS(namespace, "body");

        // Populate head section

        const reportIcon = document.createElement("link");
        reportIcon.setAttribute("rel", "icon");
        reportIcon.setAttribute("type", "image/png");
        reportHead.append(reportIcon);

        const reportStyle = reportStyleTemplate.content.cloneNode(true);
        reportHead.append(reportStyle.firstElementChild);

        // Populate body section 

        const reportBodyContent = reportTemplate.content.cloneNode(true);
        reportBody.append(reportBodyContent.firstElementChild);

        const reportItemContent = reportItemTemplate.content;

        const reportData = attachmentManager.getReportData();
        reportBody.querySelector(".current-datetime-label").textContent = new Date().toLocaleDateString();
        reportBody.querySelector(".package-file-count-label").textContent = reportData.packagingFilenameList.length.toString();

        const messageList = attachmentManager.messageList;

        const generateSection = (tableClass, iterate) =>
        {
            const currentTable = reportBody.querySelector(tableClass);

            iterate(currentTable);

            currentTable.classList.remove("hidden");
        };

        const generateReportLineItem =  (reportItemContent, item, messageInfo, specialMessage) => {
            const reportItem = reportItemContent.cloneNode(true);
    
            reportItem.querySelector(".subject-label").textContent = messageInfo.subject;
            reportItem.querySelector(".author-label").textContent = messageInfo.author;
            reportItem.querySelector(".message-date-label").textContent = messageInfo.date.toDateString();
            reportItem.querySelector(".filename-label").textContent = item.name;
            reportItem.querySelector(".file-size-label").textContent = abbreviateFileSize(item.size);

            if(specialMessage) {
                reportItem.querySelector(".special-message-row").classList.remove("hidden");
                reportItem.querySelector(".special-message-label").textContent = specialMessage;
            }
    
            return reportItem.firstElementChild;
        };

        // Standard attachments

        if(reportData.packagingTracker.items.length > 0) {
            generateSection(".attachment-table", (currentTable) => {
                for(const item of reportData.packagingTracker.items) {
                    const specialMessage = (item.isDeleted) ? messenger.i18n.getMessage("detached") : null;

                    currentTable.append(generateReportLineItem(reportItemContent, item, messageList.get(item.messageId), specialMessage));
                }
            });

            reportBody.querySelector(".saved-attachment-count-label").textContent = reportData.packagingTracker.items.length.toString();
        }

        // Duplicate attachments

        if(reportData.duplicateFileTracker.length > 0) {
            generateSection(".duplicate-table", (currentTable) => {
                for(const item of reportData.duplicateFileTracker) {
                    const specialMessage = (item.isDeleted) ? messenger.i18n.getMessage("detached") : null;

                    currentTable.append(generateReportLineItem(reportItemContent, item, messageList.get(item.messageId)));
                }
            });
        }

        // Alterations

        if(reportData.alterationTracker.length > 0) {
            generateSection(".alteration-table", (currentTable) => {
                for(const item of reportData.alterationTracker) {
                    currentTable.append(generateReportLineItem(reportItemContent, item, item, item.alteration));
                }
            });
        }

        // Embeds

        if(reportData.packagingTracker.embedItems.length > 0) {
            generateSection(".embed-table", (currentTable) => {
                for(const item of reportData.packagingTracker.embedItems) {
                    currentTable.append(generateReportLineItem(reportItemContent, item, messageList.get(item.messageId)));
                }
            });

            reportBody.querySelector(".saved-embed-count-label").textContent = reportData.packagingTracker.embedItems.length.toString();
        }

        // Duplicate embeds

        if(reportData.duplicateEmbedFileTracker) {
            generateSection(".duplicate-embed-table", (currentTable) => {
                for(const filenameEntry of reportData.duplicateEmbedFileTracker.entries()) {
                    for(const sizeEntry of filenameEntry[1].sizes.entries()) {
                        for(const checksumEntry of sizeEntry[1].entries()) {
                            for(const messageId of checksumEntry[1]) {
                                currentTable.append(generateReportLineItem(reportItemContent, { name: filenameEntry[0], size: sizeEntry[0] }, messageList.get(messageId)));
                            }
                        }
                    }
                }
            });
        }

        // Errors

        if(reportData.errorList.length > 0) {
            generateSection(".error-table", (currentTable) => {
                for(const item of reportData.errorList) {
                    currentTable.append(generateReportLineItem(reportItemContent, item, messageList.get(item.messageId), item.error));
                }
            });
        }

        // Detachment errors

        if(reportData.detachmentErrorList) {
            generateSection(".detachment-error-table", (currentTable) => {
                for(const item of reportData.detachmentErrorList) {
                    currentTable.append(generateReportLineItem(reportItemContent, item, messageList.get(item.messageId), item.error));
                }
            });
        }

        // Fetch image files and assign appropriately

        const [iconDataUrl, backgroundDataUrl] = await Promise.all([
            this.#getImageDataUrl("/icons/extractem-32px.png"),
            this.#getImageDataUrl("/ui/tiled_paperclip.png")
        ]);

        reportIcon.setAttribute("href", iconDataUrl);
        
        const reportLogo = reportBody.querySelector(".report-logo");
        reportLogo.setAttribute("src", iconDataUrl);

        reportBody.style.background = `url(${backgroundDataUrl}) center/124px repeat`;

        // Final report assembly

        const element = reportDocument.documentElement;
    
        element.appendChild(reportHead);
        element.appendChild(reportBody);

        i18n.updateAnyDocument(reportDocument);

        const fileText = `<!DOCTYPE html>${element.outerHTML}`;

        const reportFileData = new Blob([fileText], { type: "text/html" });

        await this.#downloadReport(reportFileData);
    }

    static #getImageDataUrl(filename) {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            const fileReader = new FileReader();
    
            xhr.onload = () => {
                fileReader.readAsDataURL(xhr.response);
            };

            fileReader.onload = () => {
                resolve(fileReader.result);
            };

            xhr.open("get", filename);
            xhr.responseType = "blob";
            xhr.send();        
        });
    }

    static #downloadReport(reportFileData) {
        const fileParameters = {
            url: URL.createObjectURL(reportFileData),
            filename: `${messenger.i18n.getMessage("extractionReport")}-${new Date().getTime()}.html`,
            conflictAction: "uniquify"
        };

        let downloadId;

        return new Promise((resolve) =>
        {
            const handleChanged = (progress) => {
                if(progress.id == downloadId && progress.state) {
                    let resolved = false;
                    let success = false;

                    if(progress.state.current == "complete") {
                        success = true;
                        resolved = true;
                    }
                    else if(progress.state.current == "interrupted") {
                        resolved = true;
                    }

                    if(resolved) {
                        browser.downloads.onChanged.removeListener(handleChanged);
                        URL.revokeObjectURL(fileParameters.url);
                        resolve(success);
                    }
                }
            };

            browser.downloads.onChanged.addListener(handleChanged);

            browser.downloads.download(fileParameters)
                .then(
                    (id) => { downloadId = id; },
                    (error) => {
                        browser.downloads.onChanged.removeListener(handleChanged);
                        URL.revokeObjectURL(fileParameters.url);
                    }
                );
        });
    }
}