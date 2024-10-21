import { OptionsManager } from "/module/optionsmanager.js";
import { initializeEditor } from "/options/filename-pattern.js"
import { FilterManager } from "/module/filtering/filtermanager.js";

document.addEventListener("DOMContentLoaded", async () => {
    const elem = (id) => document.getElementById(id);

    const standardUiModeCheckbox = elem("standard-ui-mode-checkbox");
    const displayQuickMenuCheckbox = elem("display-quickmenu-checkbox");
    const extractImmediateCheckbox = elem("extract-immediate-checkbox");
    const extractImmediateSubfoldersCheckbox = elem("extract-immediate-subfolders-checkbox");
    const useSilentModeCheckbox = elem("use-silent-mode-checkbox");
    const preserveFolderStructureCheckbox = elem("preserve-folder-structure-checkbox");
    const useEnhancedLoggingCheckbox = elem("use-enhanced-logging-checkbox");
    const defaultGroupingSelect = elem("default-grouping-select");
    const imagePreviewSelect = elem("image-preview-select");
    const includeEmbedsCheckbox = elem("include-embeds-checkbox");
    const omitDuplicatesCheckbox = elem("omit-duplicates-checkbox");

    const useFilenamePatternCheckbox = elem("use-filename-pattern-checkbox");
    const filenamePatternDisplayTextbox = elem("filename-pattern-display-textbox");
    const filenamePatternEditButton = elem("filename-pattern-edit-button");

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

    i18n.updateDocument();

    async function main() {
        listen(standardUiModeCheckbox, onUserInteractionOptionChanged);
        listen(displayQuickMenuCheckbox, onUserInteractionOptionChanged);
        listen(extractImmediateCheckbox, onUserInteractionOptionChanged);

        listen(extractImmediateSubfoldersCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(useSilentModeCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(preserveFolderStructureCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(useEnhancedLoggingCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(defaultGroupingSelect, (e) => setOption(e));
        listen(imagePreviewSelect, (e) => setOption(e));
        listen(includeEmbedsCheckbox, (e) => setOption(e, (c) => c.checked));
        listen(omitDuplicatesCheckbox, (e) => setOption(e, (c) => c.checked));

        listen(useFilenamePatternCheckbox, onFilenamePatternOptionChanged);

        filenamePatternEditButton.addEventListener("click", (event) => displayFilenamePatternEditor());

        standardUiModeCheckbox.checked = !(extensionOptions.displayQuickMenu || extensionOptions.extractImmediate);
        displayQuickMenuCheckbox.checked = extensionOptions.displayQuickMenu;
        extractImmediateCheckbox.checked = extensionOptions.extractImmediate;

        extractImmediateSubfoldersCheckbox.checked = extensionOptions.includeSubfolders;
        useSilentModeCheckbox.checked = extensionOptions.useSilentMode;
        preserveFolderStructureCheckbox.checked = extensionOptions.preserveFolderStructure;
        useEnhancedLoggingCheckbox.checked = extensionOptions.useEnhancedLogging;
        defaultGroupingSelect.value = extensionOptions.defaultGrouping;
        imagePreviewSelect.value = extensionOptions.defaultImagePreview;
        includeEmbedsCheckbox.checked = extensionOptions.includeEmbeds;
        omitDuplicatesCheckbox.checked = extensionOptions.omitDuplicates;

        extractImmediateSubfoldersCheckbox.disabled = !extensionOptions.extractImmediate;
        useSilentModeCheckbox.disabled = !extensionOptions.extractImmediate;

        useFilenamePatternCheckbox.checked = extensionOptions.useFilenamePattern;
        filenamePatternDisplayTextbox.value = extensionOptions.filenamePattern;

        toggleFilenamePatternEditButton(extensionOptions.useFilenamePattern);
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