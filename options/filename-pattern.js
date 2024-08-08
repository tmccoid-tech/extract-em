export let initializeEditor = (filenamePattern, dismissEditorDelegate) => { };

(function() {
    document.addEventListener("DOMContentLoaded", async () => {
        const validCharRegex = /^[\w- ]{1}$/i;
        const tokenRegex = /\{(sender|author|mm-dd-yyyy|dd-mm-yyyy|yyyy-mm-dd|yyyymmdd|filename|subject)\}/gi;
        const sourceTokenRegex = /\{(sender|author)\}/gi;
        const dateFormatTokenRegex = /\{(mm-dd-yyyy|dd-mm-yyyy|yyyy-mm-dd|yyyymmdd)\}/gi;

        const elem = (id) => { return document.getElementById(id) };


        const fpTextbox = elem("fp-textbox");

        let originalValue = "";

        fpTextbox.addEventListener("cut", cancelAction);
        fpTextbox.addEventListener("paste", cancelAction);
        fpTextbox.addEventListener("drop", cancelAction);

        fpTextbox.addEventListener("keydown", onKeyDown);

        fpTextbox.addEventListener("click", onClick);

        fpTextbox.addEventListener("input", onTextChanged);

        let testForRemovedToken = false;

        const sourceSelect = elem("source-select");
        const dateFormatSelect = elem("date-format-select");
        const filenameCheckbox = elem("filename-checkbox");
        const subjectCheckbox = elem("subject-checkbox");

        sourceSelect.addEventListener("change", onTokenSelected);
        dateFormatSelect.addEventListener("change", onTokenSelected);
        filenameCheckbox.addEventListener("click", onTokenChecked);
        subjectCheckbox.addEventListener("click", onTokenChecked);

        const sampleResultPanel = elem("sample-result-panel");

        const sourceSampleLabel = elem("source-sample-label");
        const dateFormatSampleLabel = elem("date-format-sample-label");


        const clearButton = elem("clear-button");
        const revertButton = elem("revert-button");

        clearButton.addEventListener("click", clear);
        revertButton.addEventListener("click", (e) => restoreState(originalValue));

        const cancelButton = elem("cancel-button");
        const saveButton = elem("save-button");

        cancelButton.addEventListener("click", cancelEdit);
        saveButton.addEventListener("click", saveEdit);

        let dismissEditor = (options) => {};

        const tokenSampleTextMap = new Map([
            ["{sender}", "x@y.com"],
            ["{author}", "John Q Public"],
            ["{mm-dd-yyyy}", "06-30-2024"],
            ["{dd-mm-yyyy}", "30-06-2024"],
            ["{yyyy-mm-dd}", "2024-06-30"],
            ["{yyyymmdd}", "20240630"],
            ["{filename}", "myfile"],
            ["{subject}", "re:my subject"]
        ]);

        initializeEditor = (filenamePattern, dismissEditorDelegate) => {
            originalValue = filenamePattern;
            dismissEditor = dismissEditorDelegate;

            restoreState(originalValue);
            validatePattern(originalValue);
            fpTextbox.focus();
        };

        function identifyToken(text, position) {
            const matches = text.matchAll(tokenRegex); 

            for(const match of matches) {
                if(position > match.index && position < match.index + match[0].length) {
                    return {
                        start: match.index,
                        end:  match.index + match[0].length
                    };
                }
                else if(position <= match.index) {
                    break;
                }
            }

            return null;
        }

        function setTokenSelection(text, position, direction = "forward") {
            const tokenRange = identifyToken(text, position)

            if(tokenRange) {
                fpTextbox.setSelectionRange(tokenRange.start, tokenRange.end, direction);
            }
        }

        function insertToken(token, replacedToken) {
            if(replacedToken) {
                fpTextbox.value = fpTextbox.value.replace(replacedToken, token);
            }
            else {
                fpTextbox.setRangeText(token, fpTextbox.selectionStart, fpTextbox.selectionEnd, "end");
            }
            
            validatePattern(fpTextbox.value);
            updateSampleTextLabel(fpTextbox.value);
        }

        function removeToken(token) {
            fpTextbox.value = fpTextbox.value.replace(token, "");

            validatePattern(fpTextbox.value);
            updateSampleTextLabel(fpTextbox.value);
        }

        function validatePattern(filenamePattern) {
            // Must contain at least one token, or be left blank
            let isValid = filenamePattern.length == 0 || (filenamePattern.search(tokenRegex) > -1);

            if(isValid) {
                fpTextbox.classList.remove("invalid");
                saveButton.removeAttribute("disabled");
            }
            else {
                fpTextbox.classList.add("invalid");
                saveButton.setAttribute("disabled", "disabled");
            }
        }

        function updateSampleTextLabel(patternText) {
            let sampleLabelText = patternText;

            const sourceValue = sourceSelect.value;
            const dateFormatValue = dateFormatSelect.value;

            sourceSampleLabel.innerText = (sourceValue) ? tokenSampleTextMap.get(sourceValue) : "";
            dateFormatSampleLabel.innerText = (dateFormatValue) ? tokenSampleTextMap.get(dateFormatValue) : "";

            const spanify = (value) => { return (value) ? `<span>${tokenSampleTextMap.get(value)}</span>` : ""; };

            const sourceSampleText = spanify(sourceValue);

            const dateFormatSampleText = spanify(dateFormatValue);

            const filenameSampleText = spanify((filenameCheckbox.checked) ? filenameCheckbox.value : "");

            const subjectSampleText = spanify((subjectCheckbox.checked) ? subjectCheckbox.value : "");

            sampleLabelText = sampleLabelText
                .replace(sourceSelect.value, sourceSampleText)
                .replace(dateFormatSelect.value, dateFormatSampleText)
                .replace(filenameCheckbox.value, filenameSampleText)
                .replace(subjectCheckbox.value, subjectSampleText)
            ;

            sampleResultPanel.innerHTML = (sampleLabelText) ? `${sampleLabelText}.ext` : "--";
        }

        function onTextChanged(event) {
            const { value } = event.target;

            if(testForRemovedToken) {
                testForRemovedToken = false;

                if(sourceSelect.value != "" && value.indexOf(sourceSelect.value) == -1) {
                    sourceSelect.value = "";
                    sourceSelect.setAttribute("lastValue", "");
                }

                if(dateFormatSelect.value != "" && value.indexOf(dateFormatSelect.value) == -1) {
                    dateFormatSelect.value = "";
                    dateFormatSelect.setAttribute("lastValue", "");
                }

                if(filenameCheckbox.checked && value.indexOf(filenameCheckbox.value) == -1) {
                    filenameCheckbox.checked = false;
                }

                if(subjectCheckbox.checked && value.indexOf(subjectCheckbox.value) == -1) {
                    subjectCheckbox.checked = false;
                }
            }

            validatePattern(value);
            updateSampleTextLabel(value);
        }

        function onTokenSelected(event) {
            const select = event.target;
            const lastValue = select.getAttribute("lastValue");
            const { value } = event.target;

            if(value == "") {
                removeToken(lastValue);
            }
            else {
                insertToken(value, lastValue);
            }

            select.setAttribute("lastValue", value);

            fpTextbox.focus();
        }

        function onTokenChecked(event) {
            const {
                checked,
                value
            } = event.target;

            if(checked) {
                insertToken(value);
            }
            else {
                removeToken(value);
            }

            fpTextbox.focus();
        }

        function onKeyDown(event) {
            const key = event.key;

            const textbox = event.target;
            const {
                selectionStart,
                selectionEnd,
                selectionDirection,
                value
            } = textbox;

            switch(key) {
                case "ArrowLeft":
                    if(selectionStart == selectionEnd) {
                        if(selectionStart > 0 && value[selectionStart - 1] == "}") {
                            setTokenSelection(value, selectionStart - 1, "backward");
                            event.preventDefault();                        
                        }
                    }
                    else if (event.shiftKey) {
                        if(selectionDirection == "backward" && selectionStart > 0 && value[selectionStart - 1] == "}") {
                            const tokenRange = identifyToken(value, selectionStart - 1);

                            if(tokenRange) {
                                textbox.setSelectionRange(tokenRange.start, selectionEnd, "backward");
                                event.preventDefault();
                            }
                        }
                        else if(selectionDirection == "forward" && value[selectionEnd - 1] == "}") {
                            const tokenRange = identifyToken(value, selectionEnd - 1);

                            if(tokenRange) {
                                textbox.setSelectionRange(selectionStart, tokenRange.start);
                                event.preventDefault();
                            }
                        }
                    }


                    break;

                case "ArrowRight":
                    if(selectionStart == selectionEnd) {
                        if(selectionEnd < value.length && value[selectionEnd] == "{") {
                            setTokenSelection(value, selectionEnd + 1);
                            event.preventDefault();                        
                        }
                    }
                    else if (event.shiftKey){
                        if(selectionDirection == "forward" && selectionEnd < value.length && value[selectionEnd] == "{") {
                            const tokenRange = identifyToken(value, selectionEnd + 1);

                            if(tokenRange) {
                                textbox.setSelectionRange(selectionStart, tokenRange.end);
                                event.preventDefault();                            
                            }
                        }
                        else if(selectionDirection == "backward" && value[selectionStart] == "{") {
                            const tokenRange = identifyToken(value, selectionStart + 1);

                            if(tokenRange) {
                                textbox.setSelectionRange(tokenRange.end, selectionEnd, "backward");
                                event.preventDefault();                            
                            }
                        }
                    }                

//                    console.log(`${value[textbox.selectionStart]} ${value[textbox.selectionEnd]} ${textbox.selectionStart} ${textbox.selectionEnd} ${textbox.selectionDirection}`);

                    break;

                case "Backspace":
                    if(selectionStart == selectionEnd && selectionStart > 0) {
                        if(value[selectionStart - 1] == "}") {
                            setTokenSelection(value, selectionStart - 1);
                        }
                    }
                    testForRemovedToken = true;
                    break;

                case "Delete":
                    if(selectionStart == selectionEnd && selectionEnd > 0) {
                        if(value[selectionStart] == "{") {
                            setTokenSelection(value, selectionStart + 1);
                        }
                    }
                    testForRemovedToken = true;
                    break;

                case "Home":
                case "End":
                case "Tab":
                case "Enter":
                    break;

                default:
                    if(validCharRegex.test(key)) {
                        if(selectionEnd > selectionStart) {
                            testForRemovedToken = true;
                        }
                    }
                    else {
                        event.preventDefault();
                    }
                    break;
            }
        }

        function onClick(event) {
            const textbox = event.target;

            const {
                value,
                selectionStart,
                selectionEnd
            } = textbox;

            if(selectionStart > 0) {
                if(selectionStart == selectionEnd) {
                    if(selectionEnd < value.length) {
                        setTokenSelection(value, selectionStart);
                        return;
                    }
                }
                else {
                    const startTokenRange = identifyToken(value, selectionStart);
        
                    if(startTokenRange) {
                        textbox.selectionStart = startTokenRange.start;
                    }
                }
            }

            if(selectionEnd < value.length) {
                const endTokenRange = identifyToken(value, selectionEnd);

                if(endTokenRange) {
                    textbox.selectionEnd = endTokenRange.end;
                }
            }
        }

        function clear(event) {
            fpTextbox.value = "";
            testForRemovedToken = true;
            fpTextbox.dispatchEvent(new Event("input"));
            fpTextbox.focus();
        }

        function restoreState(filenamePattern) {

            const sourceSelectMatch = filenamePattern.match(sourceTokenRegex);

            sourceSelect.value = (sourceSelectMatch) ? sourceSelectMatch[0] : ""
            sourceSelect.setAttribute("lastValue", sourceSelect.value);

            const dateFormatSelectMatch = filenamePattern.match(dateFormatTokenRegex);

            dateFormatSelect.value = (dateFormatSelectMatch) ? dateFormatSelectMatch[0] : "";
            dateFormatSelect.setAttribute("lastValue", dateFormatSelect.value);

            filenameCheckbox.checked = (filenamePattern.indexOf(filenameCheckbox.value) != -1 );
            subjectCheckbox.checked = (filenamePattern.indexOf(subjectCheckbox.value) != -1);

            fpTextbox.value = filenamePattern;

            updateSampleTextLabel(filenamePattern);
            validatePattern(filenamePattern);

            fpTextbox.focus();
        }

        function cancelEdit(event) {
            dismissEditor({ cancel: true, value: originalValue });
        }

        function saveEdit(event) {
            dismissEditor({ cancel: false, value: fpTextbox.value });
        }

        function cancelAction(event) {
            event.preventDefault();
            return false;
        }
    });
})();