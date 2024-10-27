import { OptionsManager } from "/module/optionsmanager.js";
import { initializeEditor } from "/options/filename-pattern.js"
import { FilterManager } from "/module/filtering/filtermanager.js";
import { SaveManager } from "/module/savemanager.js";

document.addEventListener("DOMContentLoaded", async () => {
    const elem = (id) => document.getElementById(id);

    const standardUiModeCheckbox = elem("standard-ui-mode-checkbox");
    const displayQuickMenuCheckbox = elem("display-quickmenu-checkbox");
    const extractImmediateCheckbox = elem("extract-immediate-checkbox");
    const extractImmediateSubfoldersCheckbox = elem("extract-immediate-subfolders-checkbox");
    const useSilentModeCheckbox = elem("use-silent-mode-checkbox");

    const packageAttachmentsRadio = elem("package-attachments-radio");
    const directSaveRadio = elem("direct-save-radio");
    const alwaysPromptForDownloadLocationCheckbox = elem("always-prompt-for-donwload-location-checkbox");
    const preserveFolderStructureCheckbox = elem("preserve-folder-structure-checkbox");
    const currentSaveDirectorySpan = elem("current-save-directory-span");

    const useFilenamePatternCheckbox = elem("use-filename-pattern-checkbox");
    const filenamePatternDisplayTextbox = elem("filename-pattern-display-textbox");
    const filenamePatternEditButton = elem("filename-pattern-edit-button");

    const includeEmbedsCheckbox = elem("include-embeds-checkbox");
    const omitDuplicatesCheckbox = elem("omit-duplicates-checkbox");
    const useEnhancedLoggingCheckbox = elem("use-enhanced-logging-checkbox");

    const defaultGroupingSelect = elem("default-grouping-select");
    const imagePreviewSelect = elem("image-preview-select");

    const filenameEditorOverlay = elem("filename-editor-overlay");

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
    
    const extensionOptions = await OptionsManager.retrieve();

    await FilterManager.initializeEditor(filterElements, extensionOptions);

    const currentSaveDirectory = await SaveManager.determineDownloadDirectory();

    i18n.updateDocument();

    async function main() {
        listen(standardUiModeCheckbox, onUserInteractionOptionChanged);
        listen(displayQuickMenuCheckbox, onUserInteractionOptionChanged);
        listen(extractImmediateCheckbox, onUserInteractionOptionChanged);
        listen(extractImmediateSubfoldersCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(useSilentModeCheckbox, (e) => setOption(e, (c) => c.checked));

        listen(packageAttachmentsRadio, onStorageOptionChanged);
        listen(directSaveRadio, onStorageOptionChanged);

        listen(alwaysPromptForDownloadLocationCheckbox, (e) => setOption(e, (c) => c.checked))
        listen(preserveFolderStructureCheckbox, (e) => setOption(e, (c) => c.checked));

        listen(useFilenamePatternCheckbox, onFilenamePatternOptionChanged);
        filenamePatternEditButton.addEventListener("click", (event) => displayFilenamePatternEditor());

        listen(includeEmbedsCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(omitDuplicatesCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(useEnhancedLoggingCheckbox, (e) => setOption(e, (c) => c.checked));

        listen(defaultGroupingSelect, (e) => setOption(e));
        listen(imagePreviewSelect, (e) => setOption(e));

        standardUiModeCheckbox.checked = !(extensionOptions.displayQuickMenu || extensionOptions.extractImmediate);
        displayQuickMenuCheckbox.checked = extensionOptions.displayQuickMenu;
        extractImmediateCheckbox.checked = extensionOptions.extractImmediate;
        extractImmediateSubfoldersCheckbox.checked = extensionOptions.includeSubfolders;
        useSilentModeCheckbox.checked = extensionOptions.useSilentMode;

        extractImmediateSubfoldersCheckbox.disabled = !extensionOptions.extractImmediate;
        useSilentModeCheckbox.disabled = !extensionOptions.extractImmediate;

        packageAttachmentsRadio.checked = !extensionOptions.directSave;
        directSaveRadio.checked = extensionOptions.directSave;
        alwaysPromptForDownloadLocationCheckbox.checked = extensionOptions.alwaysPromptForDownloadLocation;
        alwaysPromptForDownloadLocationCheckbox.disabled = extensionOptions.directSave;
        preserveFolderStructureCheckbox.checked = extensionOptions.preserveFolderStructure;
        preserveFolderStructureCheckbox.disabled = extensionOptions.directSave;
        currentSaveDirectorySpan.innerText = currentSaveDirectory;

        useFilenamePatternCheckbox.checked = extensionOptions.useFilenamePattern;
        filenamePatternDisplayTextbox.value = extensionOptions.filenamePattern;
        toggleFilenamePatternEditButton(extensionOptions.useFilenamePattern);

        includeEmbedsCheckbox.checked = extensionOptions.includeEmbeds;
        omitDuplicatesCheckbox.checked = extensionOptions.omitDuplicates;
        useEnhancedLoggingCheckbox.checked = extensionOptions.useEnhancedLogging;

        defaultGroupingSelect.value = extensionOptions.defaultGrouping;
        imagePreviewSelect.value = extensionOptions.defaultImagePreview;
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
        const displayQuickMenu = (mode == "quickmenu");
        const extractImmediate = (mode == "immediate");

        OptionsManager.setOption("displayQuickMenu", displayQuickMenu);
        OptionsManager.setOption("extractImmediate", extractImmediate);
        OptionsManager.setOption("isInitialized", true);

        extractImmediateSubfoldersCheckbox.disabled = !extractImmediate;
        useSilentModeCheckbox.disabled = !extractImmediate;
    }

    function onStorageOptionChanged(event) {
        const directSave = (event.srcElement.value === "true");

        OptionsManager.setOption("directSave", directSave);

        alwaysPromptForDownloadLocationCheckbox.disabled = directSave;
        preserveFolderStructureCheckbox.disabled = directSave;
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
        }
        else {
            OptionsManager.setOption("useFilenamePattern", false);
        }

        toggleFilenamePatternEditButton(useFilenamePatternCheckbox.checked);
    }

    function onFilenamePatternEditorDismissed(options) {
        if(!options.cancel) {
            OptionsManager.setOption("filenamePattern", options.value);
        }

        const useFilenamePattern = (options.value.length > 0);

        filenamePatternDisplayTextbox.value = options.value;

        toggleFilenamePatternEditButton(useFilenamePattern);

        useFilenamePatternCheckbox.checked = useFilenamePattern;
        OptionsManager.setOption("useFilenamePattern", useFilenamePattern)

        filenameEditorOverlay.classList.add("hidden");
    }

    function toggleFilenamePatternEditButton(useFilenamePattern) {
        if(useFilenamePattern) {
            filenamePatternEditButton.removeAttribute("disabled");
        }
        else {
            filenamePatternEditButton.setAttribute("disabled", "disabled");
        }
    }

    await main();
});