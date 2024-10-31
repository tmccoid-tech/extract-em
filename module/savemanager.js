export class SaveManager {
    static async determineDownloadDirectory() {
        let result = null;

        const tempFilename = `extractem${new Date().getTime()}`;

        const saveOptions = {
            fileData: new Blob([]),
            filename: tempFilename,
            saveAs: false,
            onSaveStarted: (downloadItem) => {
                const regEx = new RegExp(`^(.*)${tempFilename}`);
                result = regEx.exec(downloadItem.filename)[1];
            },
            onSaveComplete: (downloadId) => {
                browser.downloads.removeFile(downloadId);
            }
        };

        await this.save(saveOptions);

        return result;
    }

    // May not require; reconsider
    static async getDownloadFolder(downloadId) {
        let result = await browser.downloads.search({ id: downloadId })
        return result;
    }

    static async save(saveOptions) {
        let downloadId = null;

        const { download, onChanged, onCreated } = browser.downloads;
        const {
            onSaveStarted,
            onSaveError = this.#onSaveError,
            onSaveComplete = this.#onSaveComplete
        } = saveOptions;

        const downloadParams = {
            url: URL.createObjectURL(saveOptions.fileData),

            // Hack to compensate for .url files resulting in "illegal characters" error during save
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1827115
            filename: saveOptions.filename.replace(/\.url$/, ".ur_"),

//            headers: [ { "name": "Last-Modified", "value": "Wed, 21 Oct 2015 07:28:00 GMT" } ],

            conflictAction: "uniquify",
            saveAs: saveOptions.saveAs
        };

        return new Promise((resolve) =>
        {
            const cleanup = () => {
    //            console.log("Cleaning up");

                URL.revokeObjectURL(downloadParams.url);
                onChanged.removeListener(handleChanged);
                onCreated.removeListener(handleCreated);
            };

            const handleCreated = (downloadItem) => {
                if(downloadItem.url == downloadParams.url) {
    //                console.log("Save started");

                    if(onSaveStarted) {
                        onSaveStarted(downloadItem);
                    }
                }
            };

            const handleChanged = (progress) => {
                if(progress.id == downloadId) {
    //                console.log("Save state changed");

                    const currentState = progress.state.current;
                    let executionComplete = false;
                    let result;

                    if(currentState == "complete") {
    //                    console.log("Save complete");

                        result = onSaveComplete(progress.id);

                        executionComplete = true;
                    }
                    else if(currentState == "interrupted") {
    //                    console.log("Save interrupted");

                        const error = (progress.error) ? progress.error.message : messenger.i18n.getMessage("saveFailed");

                        result = onSaveError(error);

                        executionComplete = true;
                    }

                    if(executionComplete) {
                        cleanup();

                        resolve(result);
                    }
                }
            };

            onChanged.addListener(handleChanged);
            onCreated.addListener(handleCreated);

            download(downloadParams).then(
                (id) => {
                    downloadId = id;
                },
                (error) => {
                    const result = onSaveError(error.message);

                    cleanup();

                    resolve(result);
                }
            );
        });
    }

    static #onSaveError(errorMessage) {
        return {
            success: false,
            status: "error",
            message: errorMessage
        };
    }

    static #onSaveComplete(downloadId) {
        return {
            success: true,
            status: "success",
            message: messenger.i18n.getMessage("saveComplete"),
            downloadId: downloadId
        };
    }
}