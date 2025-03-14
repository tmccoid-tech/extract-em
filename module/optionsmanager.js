export class OptionsManager {
    static #defaultOptions = {
        isInitialized: false,

        // UI Mode
        displayQuickmenu: true,
        extractImmediate: false,
        includeSubfolders: false,
        useSilentMode: false,
        
        // Discovery Options
        includeEmbeds: false,
        useFileTypeFilter: "",
        includedFilterFileTypes: new Set(),
        includeUnlistedFileTypes: false,
        additionalFilterFileTypes: new Map([
            ["~gen", new Set()],
            ["~img", new Set()],
            ["~aud", new Set()],
            ["~vid", new Set()]
        ]),
        omitDuplicates: true,
        
        enableMessageTagging: false,
        tagMessages: false,
        
        defaultGrouping: "None",
        defaultImagePreview: "None",

        // Storage Options
        packageAttachments: true,
        alwaysPromptForDownloadLocation: true,
        preserveFolderStructure: false,
        useFilenamePattern: false,
        filenamePattern: "",
        maxFilenameSubjectLength: 200,
        
        useEnhancedLogging: false,

        lastLoadedVersion: ""
    };

    static #options = null;

    static async retrieve() {
        const storedOptions = await browser.storage.local.get("options");

        this.#options = { ...this.#defaultOptions, ...storedOptions?.options };

        const options = this.#options;

        if(options.useFileTypeFilter && !(options.includedFilterFileTypes.size > 0 || options.includeUnlistedFileTypes)) {
            options.useFileTypeFilter = false;
        }

        await this.#save();

        return this.#options;
    };

    static async #save() {
        await browser.storage.local.set({  options: this.#options });
    };

    static async setOption(key, value) {
        this.#options[key] = value;

        await this.#save();
    }

    static #logOptions(context) {
        const message = `${context}: ${JSON.stringify(this.#options)}`;
    }
}