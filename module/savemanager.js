export class SaveManager {
    static async save(saveOptions) {
        let downloadId = null;

        const { download, onChanged, onCreated } = browser.downloads;
        const { onSaveStarted, onSaveError, onSaveComplete } = saveOptions;

        const downloadParams = {
            url: URL.createObjectURL(saveOptions.fileData),
            filename: saveOptions.filename,
            conflictAction: "uniquify",
            saveAs: saveOptions.saveAs
        };

        const cleanup = () => {
            console.log("Cleaning up");

            URL.revokeObjectURL(downloadParams.url);
            onChanged.removeListener(handleChanged);
            onCreated.removeListener(handleCreated);
        };

        const handleCreated = (downloadItem) => {
            if(downloadItem.url == downloadParams.url) {
                console.log("Save started");

                if(onSaveStarted) {
                    onSaveStarted(downloadItem);
                }
            }
        };

        const handleChanged = (progress) => {
            if(progress.id == downloadId) {
                console.log("Save state changed");

                const currentState = progress.state.current;
                let executionComplete = false;

                if(currentState == "complete") {
                    console.log("Save complete");

                    onSaveComplete(progress.id);

                    executionComplete = true;
                }
                else if(currentState == "interrupted") {
                    console.log("Save interrupted");

                    onSaveError(progress.error);

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
                console.log("Save error");

                onSaveError(error);

                cleanup();
            }
        );
    }
}