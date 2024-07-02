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
        useFilenamePattern: false,
        filenamePattern: "",
        lastLoadedVersion: ""
    };

    static #options = null;

    static async retrieve() {
        const storedOptions = await browser.storage.local.get("options");

        this.#options = { ...this.#defaultOptions, ...storedOptions?.options };

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