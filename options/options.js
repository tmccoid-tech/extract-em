import { OptionsManager } from "/module/optionsmanager.js";
import { initializeEditor } from "/options/filename-pattern.js"
import { FilterManager } from "/module/filtering/filtermanager.js";
import { SaveManager } from "/module/savemanager.js";

document.addEventListener("DOMContentLoaded", async () => {
    const elem = (id) => document.getElementById(id);

    // UI Mode
    const displayQuickmenuCheckbox = elem("display-quickmenu-checkbox");
    const extractImmediateCheckbox = elem("extract-immediate-checkbox");
    const extractImmediateSubfoldersCheckbox = elem("extract-immediate-subfolders-checkbox");
    const useSilentModeCheckbox = elem("use-silent-mode-checkbox");
    const standardUiModeCheckbox = elem("standard-ui-mode-checkbox");

    // Discovery Options
    const includeEmbedsCheckbox = elem("include-embeds-checkbox");
    const filterElements = {
        editorOverlay: elem("filter-overlay"),
        editorContainer: elem("filter-editor-container"),
        menuCheckbox: elem("use-file-type-filter-checkbox"),
        menuEditButton: elem("edit-file-type-filter-button"),
        menuFileTypeList: elem("file-type-filter-list-div"),
        secondaryCheckbox: null,
        secondaryEditButton: null,
        secondaryFileTypeList: null
    };
    const omitDuplicatesCheckbox = elem("omit-duplicates-checkbox");
    const defaultGroupingSelect = elem("default-grouping-select");
    const imagePreviewSelect = elem("image-preview-select");

    // Storage Options
    const packageAttachmentsRadio = elem("package-attachments-radio");
    const alwaysPromptForDownloadLocationCheckbox = elem("always-prompt-for-donwload-location-checkbox");
    const preserveFolderStructureCheckbox = elem("preserve-folder-structure-checkbox");
    const directSaveRadio = elem("direct-save-radio");
    const currentSaveDirectorySpan = elem("current-save-directory-span");
    const useFilenamePatternCheckbox = elem("use-filename-pattern-checkbox");
    const filenamePatternDisplayTextbox = elem("filename-pattern-display-textbox");
    const filenamePatternEditButton = elem("filename-pattern-edit-button");
    const maxFilenameSubjectLengthTextbox = elem("max-filename-subject-length-textbox");
    const filenameEditorOverlay = elem("filename-editor-overlay");

    const useEnhancedLoggingCheckbox = elem("use-enhanced-logging-checkbox");
   

    const extensionOptions = await OptionsManager.retrieve();

    await FilterManager.initializeEditor(filterElements, extensionOptions);

    const currentSaveDirectory = await SaveManager.determineDownloadDirectory();

    i18n.updateDocument();

    async function main() {
        // UI Mode
        listen(displayQuickmenuCheckbox, onUserInteractionOptionChanged);
        listen(extractImmediateCheckbox, onUserInteractionOptionChanged);
        listen(extractImmediateSubfoldersCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(useSilentModeCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(standardUiModeCheckbox, onUserInteractionOptionChanged);

        displayQuickmenuCheckbox.checked = extensionOptions.displayQuickmenu;
        extractImmediateCheckbox.checked = extensionOptions.extractImmediate;
        extractImmediateSubfoldersCheckbox.checked = extensionOptions.includeSubfolders;
        useSilentModeCheckbox.checked = extensionOptions.useSilentMode;
        standardUiModeCheckbox.checked = !(extensionOptions.displayQuickmenu || extensionOptions.extractImmediate);

        extractImmediateSubfoldersCheckbox.disabled = !extensionOptions.extractImmediate;
        useSilentModeCheckbox.disabled = !extensionOptions.extractImmediate;

        // Discovery Options
        listen(includeEmbedsCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(omitDuplicatesCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(defaultGroupingSelect, (e) => setOption(e));
        listen(imagePreviewSelect, (e) => setOption(e));

        includeEmbedsCheckbox.checked = extensionOptions.includeEmbeds;
        omitDuplicatesCheckbox.checked = extensionOptions.omitDuplicates;
        defaultGroupingSelect.value = extensionOptions.defaultGrouping;
        imagePreviewSelect.value = extensionOptions.defaultImagePreview;

        // Storage Options
        listen(packageAttachmentsRadio, onStorageOptionChanged);
        listen(alwaysPromptForDownloadLocationCheckbox, (e) => setOption(e, (c) => c.checked))
        listen(preserveFolderStructureCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(directSaveRadio, onStorageOptionChanged);
        listen(useFilenamePatternCheckbox, onFilenamePatternOptionChanged);
        filenamePatternEditButton.addEventListener("click", (e) => displayFilenamePatternEditor());
        listen(maxFilenameSubjectLengthTextbox, onMaxFilenamePatternChanged);

        packageAttachmentsRadio.checked = extensionOptions.packageAttachments;
        alwaysPromptForDownloadLocationCheckbox.checked = extensionOptions.alwaysPromptForDownloadLocation;
        preserveFolderStructureCheckbox.checked = extensionOptions.preserveFolderStructure;
        directSaveRadio.checked = !extensionOptions.packageAttachments;
        currentSaveDirectorySpan.innerText = currentSaveDirectory;
        useFilenamePatternCheckbox.checked = extensionOptions.useFilenamePattern;
        filenamePatternDisplayTextbox.value = extensionOptions.filenamePattern;
        maxFilenameSubjectLengthTextbox.value = extensionOptions.maxFilenameSubjectLength;

        alwaysPromptForDownloadLocationCheckbox.disabled = !extensionOptions.packageAttachments;
        preserveFolderStructureCheckbox.disabled = !extensionOptions.packageAttachments;
        toggleFilenamePatternChildControls(extensionOptions.useFilenamePattern);
        maxFilenameSubjectLengthTextbox.disabled = !extensionOptions.useFilenamePattern;

        listen(useEnhancedLoggingCheckbox, (e) => setOption(e, (c) => c.checked));

        useEnhancedLoggingCheckbox.checked = extensionOptions.useEnhancedLogging;

        const body = elem("body");
        body.classList.add("shown");
    }

    function listen(element, handler) {
        element.addEventListener("change", handler);
    }

    function setOption(event, getValue = (c) => c.value) {
        const element = event.srcElement;
        const optionName = element.getAttribute("option-name");
        OptionsManager.setOption(optionName, getValue(element));
    }

    function onUserInteractionOptionChanged(event) {
        const mode = event.srcElement.value;
        const displayQuickmenu = (mode == "quickmenu");
        const extractImmediate = (mode == "immediate");

        OptionsManager.setOption("displayQuickmenu", displayQuickmenu);
        OptionsManager.setOption("extractImmediate", extractImmediate);
        OptionsManager.setOption("isInitialized", true);

        extractImmediateSubfoldersCheckbox.disabled = !extractImmediate;
        useSilentModeCheckbox.disabled = !extractImmediate;
    }

    function onStorageOptionChanged(event) {
        const packageAttachments = (event.srcElement.value === "true");

        OptionsManager.setOption("packageAttachments", packageAttachments);

        alwaysPromptForDownloadLocationCheckbox.disabled = !packageAttachments;
        preserveFolderStructureCheckbox.disabled = !packageAttachments;
    }

    function displayFilenamePatternEditor() {
        filenameEditorOverlay.classList.remove("hidden");
        initializeEditor(filenamePatternDisplayTextbox.value, onFilenamePatternEditorDismissed);
    }

    function onFilenamePatternOptionChanged(event) {
        if(useFilenamePatternCheckbox.checked) {
            if(filenamePatternDisplayTextbox.value.length == 0) {
                displayFilenamePatternEditor();
                return;
            }
            
            OptionsManager.setOption("useFilenamePattern", true);
        }
        else {
            OptionsManager.setOption("useFilenamePattern", false);
        }

        toggleFilenamePatternChildControls(useFilenamePatternCheckbox.checked);
    }

    function onMaxFilenamePatternChanged(event) {
        let isValid = false;
        
        let provisionalValue = maxFilenameSubjectLengthTextbox.value;
        
        if(/^\d{1,3}$/.test(provisionalValue)) {
            provisionalValue = Number(provisionalValue);

            if(provisionalValue > 0 && provisionalValue < 201) {
                OptionsManager.setOption("maxFilenameSubjectLength", provisionalValue);
                isValid = true;
            }
        }
        
        if(!isValid) {
            maxFilenameSubjectLengthTextbox.value = extensionOptions.maxFilenameSubjectLength;
        }
    }

    function onFilenamePatternEditorDismissed(options) {
        if(!options.cancel) {
            OptionsManager.setOption("filenamePattern", options.value);
        }

        const useFilenamePattern = (options.value.length > 0);

        filenamePatternDisplayTextbox.value = options.value;

        toggleFilenamePatternChildControls(useFilenamePattern);

        useFilenamePatternCheckbox.checked = useFilenamePattern;
        OptionsManager.setOption("useFilenamePattern", useFilenamePattern)

        filenameEditorOverlay.classList.add("hidden");
    }

    function toggleFilenamePatternChildControls(useFilenamePattern) {
        if(useFilenamePattern) {
            filenamePatternEditButton.removeAttribute("disabled");
            maxFilenameSubjectLengthTextbox.removeAttribute("disabled");
        }
        else {
            filenamePatternEditButton.setAttribute("disabled", "disabled");
            maxFilenameSubjectLengthTextbox.setAttribute("disabled", "disabled");
        }
    }

    await main();
});