export class OptionsManager {
    static #defaultOptions = {
        isInitialized: false,
        displayQuickMenu: true,
        extractImmediate: false,
        includeSubfolders: false,
        useSilentMode: false,
        preserveFolderStructure: false,
        useEnhancedLogging: false,
        defaultGrouping: "None",
        defaultImagePreview: "sm",
        includeEmbeds: false,
        omitDuplicates: true,

        useFilenamePattern: false,
        filenamePattern: "",
        
        useFileTypeFilter: "",
        includedFilterFileTypes: [],
        includeUnlistedFileTypes: false,
        additionalFilterFileTypes: new Map([
            ["~gen", new Map()],
            ["~img", new Map()],
            ["~aud", new Map()],
            ["~vid", new Map()]
        ]),
        
        lastLoadedVersion: ""
    };

    static #options = null;

    static async retrieve() {
        const storedOptions = await browser.storage.local.get("options");

        this.#options = { ...this.#defaultOptions, ...storedOptions?.options };

        const options = this.#options;

        if(options.useFileTypeFilter && !(options.includedFilterFileTypes.length > 0 || options.includeUnlistedFileTypes)) {
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