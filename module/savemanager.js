export class SaveManager {
    static async determineDownloadDirectory() {
        let result = null;

        const saveOptions = {
            fileData: new Blob([]),
            filename: `extractem_${new Date().getTime()}`,
            saveAs: false,
            onSaveStarted: (downloadItem) => {
                result = downloadItem.filename;
                console.log(/^(.*)\\/.exec(result)[0]);
            },
            onError: (error) => {

            },
            onSaveComplete: (downloadId) => {
                browser.downloads.removeFile(downloadId);
            }
        };

        await this.save(saveOptions);

        return result;
    }

    static async save(saveOptions) {
        let downloadId = null;

        const { download, onChanged, onCreated } = browser.downloads;
        const { onSaveStarted, onSaveError, onSaveComplete } = saveOptions;

        const downloadParams = {
            url: URL.createObjectURL(saveOptions.fileData),

            // Hack to compensate for .url files resulting in "illegal characters" error during save
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1827115
            filename: saveOptions.filename.replace(/\.url$/, ".ur_"),

//            headers: [ { "name": "Last-Modified", "value": "Wed, 21 Oct 2015 07:28:00 GMT" } ],

            conflictAction: "uniquify",
            saveAs: saveOptions.saveAs
        };

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

                if(currentState == "complete") {
//                    console.log("Save complete");

                    onSaveComplete(progress.id);

                    executionComplete = true;
                }
                else if(currentState == "interrupted") {
//                    console.log("Save interrupted");

                    const error = (progress.error) ? progress.error.message : messenger.i18n.getMessage("saveFailed");

                    onSaveError(error);

                    executionComplete = true;
                }

                if(executionComplete) {
                    cleanup();
                }
            }
        };

        onChanged.addListener(handleChanged);
        onCreated.addListener(handleCreated);

        return download(downloadParams).then(
            (id) => {
                downloadId = id;
            },
            (error) => {
//                console.log("Save error");

                onSaveError(error.message);

                cleanup();
            }
        );
    }
}