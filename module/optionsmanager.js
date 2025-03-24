import { i18nText } from "/module/i18nText.js";

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
        tagKey: null,
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

    static #globalTag = {
        title: `~EE!: ${i18nText.extracted}`,
        color: "#94642a"
    };

    static async retrieve() {
        const storedOptions = await browser.storage.local.get("options");

        this.#options = { ...this.#defaultOptions, ...storedOptions?.options };

        const options = this.#options;

        if(options.useFileTypeFilter && !(options.includedFilterFileTypes.size > 0 || options.includeUnlistedFileTypes)) {
            options.useFileTypeFilter = false;
        }

        await this.#save();

        return this.#options;
    }

    static async #save() {
        await browser.storage.local.set({  options: this.#options });
    }

    static async setOption(key, value) {
        this.#options[key] = value;

        await this.#save();
    }

    static #logOptions(context) {
        const message = `${context}: ${JSON.stringify(this.#options)}`;
    }

    // Tagging management

    static tagging = {
        retrieveGlobalTag: async () => {
            const { title } = this.#globalTag;
            const globalTagList = await messenger.messages.tags.list();
            
            const result = globalTagList.find((t) => t.tag == title);

            return result;
        },

        initializeGlobalTag: async () => {
            let tagKey = null;
   
            let globalTag = await this.tagging.retrieveGlobalTag();

            if(globalTag) {
                tagKey = globalTag.key; 
            }
            else {
                const { title, color } = this.#globalTag;

                const charTable = "qjxzwkvfbh";

                const timestamp = `${(new Date().getTime()) % 10_000_000}`.padStart(7, "0");

                const uid = [...timestamp].slice(0, 6).reduce((c, v) => c + charTable[parseInt(v)], "");

                tagKey = `ee~${uid}`;

                await messenger.messages.tags.create(tagKey, title, color);
            }

            this.setOption("tagKey", tagKey);
        },

        clearGlobalTag: async () => {
            const globalTag = await this.tagging.retrieveGlobalTag();
            
            if(globalTag) {
                await messenger.messages.tags.delete(globalTag.key);
            }

            this.setOption("tagKey", null);
        },

        isTagged: (tagList) => {
            return tagList.includes(this.#options.tagKey);
        },

        tagMessage: async (messageId) => {
            const message = await messenger.messages.get(messageId);

            const { id, tags } = message;
    
            if(!this.tagging.isTagged(tags)) {
                tags.push(this.#options.tagKey);
   
                await messenger.messages.update(id, { tags: tags });
            }
         }
    };
}