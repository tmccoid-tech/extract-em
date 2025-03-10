export class EmbedManager {
    static base64Map = new Map([..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="].map((c, i) => [c, i] ));

    static primeTable = new Uint8Array([
        0x03,	0x05,	0x07,	0x0B,	0x0D,	0x11,	0x13,	0x17,	0x1D,	0x1F,	0x25,	0x29,	0x2B,	0x2F,	0x35,	0x3B,
        0x3D,	0x43,	0x47,	0x49,	0x4F,	0x53,	0x59,	0x61,	0x65,	0x67,	0x6B,	0x6D,	0x71,	0x7F,	0x83,	0x89,
        0x8B,	0x95,	0x97,	0x9D,	0xA3,	0xA7,	0xAD,	0xB3,	0xB5,	0xBF,	0xC1,	0xC5,	0xC7,	0xD3,	0xDF,	0xE3,
        0xE5,	0xE9,	0xEF,	0xF1,	0xFB,	0x03,	0x05,	0x07,	0x0B,	0x0D,	0x11,	0x13,	0x17,	0x1D,	0x1F,	0x25,
        0x29,	0x2B,	0x2F,	0x35,	0x3B,	0x3D,	0x43,	0x47,	0x49,	0x4F,	0x53,	0x59,	0x61,	0x65,	0x67,	0x6B,
        0x6D,	0x71,	0x7F,	0x83,	0x89,	0x8B,	0x95,	0x97,	0x9D,	0xA3,	0xA7,	0xAD,	0xB3,	0xB5,	0xBF,	0xC1,
        0xC5,	0xC7,	0xD3,	0xDF,	0xE3,	0xE5,	0xE9,	0xEF,	0xF1,	0xFB,	0x03,	0x05,	0x07,	0x0B,	0x0D,	0x11,
        0x13,	0x17,	0x1D,	0x1F,	0x25,	0x29,	0x2B,	0x2F,	0x35,	0x3B,	0x3D,	0x43,	0x47,	0x49,	0x4F,	0x53,
        0x59,	0x61,	0x65,	0x67,	0x6B,	0x6D,	0x71,	0x7F,	0x83,	0x89,	0x8B,	0x95,	0x97,	0x9D,	0xA3,	0xA7,
        0xAD,	0xB3,	0xB5,	0xBF,	0xC1,	0xC5,	0xC7,	0xD3,	0xDF,	0xE3,	0xE5,	0xE9,	0xEF,	0xF1,	0xFB,	0x03,
        0x05,	0x07,	0x0B,	0x0D,	0x11,	0x13,	0x17,	0x1D,	0x1F,	0x25,	0x29,	0x2B,	0x2F,	0x35,	0x3B,	0x3D,
        0x43,	0x47,	0x49,	0x4F,	0x53,	0x59,	0x61,	0x65,	0x67,	0x6B,	0x6D,	0x71,	0x7F,	0x83,	0x89,	0x8B,
        0x95,	0x97,	0x9D,	0xA3,	0xA7,	0xAD,	0xB3,	0xB5,	0xBF,	0xC1,	0xC5,	0xC7,	0xD3,	0xDF,	0xE3,	0xE5,
        0xE9,	0xEF,	0xF1,	0xFB,	0x03,	0x05,	0x07,	0x0B,	0x0D,	0x11,	0x13,	0x17,	0x1D,	0x1F,	0x25,	0x29,
        0x2B,	0x2F,	0x35,	0x3B,	0x3D,	0x43,	0x47,	0x49,	0x4F,	0x53,	0x59,	0x61,	0x65,	0x67,	0x6B,	0x6D,
        0x71,	0x7F,	0x83,	0x89,	0x8B,	0x95,	0x97,	0x9D,	0xA3,	0xA7,	0xAD,	0xB3,	0xB5,	0xBF,	0xC1,	0xC5
    ]);


    static decodeBase64(source, padCount, decode) {
        let
            sourceLength = source.length,
            bufferLength = sourceLength * 0.75;

        const buffer = new Uint8Array(bufferLength);

        const checksum = decode(source, buffer, padCount);

        return {
            data: buffer.subarray(0, bufferLength - padCount),
            checksum: checksum
        };
    }

    static decodeChecksum(source, buffer, padCount) {
        const checksumMask9 = 0b111111111;

        let
            i,                          // Source index
            j = 0,                      // Result index
            e2,
            e3,
            e4,

            checksum = (0b10100000 | ((buffer.length - padCount) & 0x0F)) << 24;

        const primeTable = EmbedManager.primeTable;

        for (i = 0; i < source.length; i += 4) {
            e2 = source[i + 1];
            e3 = source[i + 2];
            e4 = source[i + 3];

            assign: {
                buffer[j] = (source[i] << 2) | (e2 >> 4);
                checksum += (buffer[j] << 14) * primeTable[++j & 0xFF];

                if(e3 == 64)
                    break assign;

                buffer[j] = ((e2 & 0b00001111) << 4) | (e3 >> 2);
                checksum += (buffer[j] << 7) * primeTable[++j & 0xFF];

                if(e4 == 64)
                    break assign;

                buffer[j] = ((e3 & 0b00000011) << 6) | (e4 & 0b00111111);
                checksum += buffer[j] * primeTable[++j & 0xFF];
            }

            checksum = (checksum << 9) | ((checksum >>> 23) & checksumMask9);
        }

        return checksum;
    }

    static identifyEmbeds(messageId, date, parts, embeds = []) {
        const quoteReplace = /["']/g;

        for (const part of parts) {
            if(part.contentType == "multipart/related" /* || part.contentType == "multipart/mixed" */) {
                const contentType = part.headers["content-type"];

                if(contentType && contentType.length > 0) {
                    const tokens = contentType[0].split(";");

                    if(tokens.length > 1) {
                        const boundaryToken = tokens[1].trim();

                        if(boundaryToken.startsWith("boundary=")) {
                            const boundary = boundaryToken.substring(9).replace(quoteReplace, "");

                            if(part.parts) {
                                for(const candidatePart of part.parts) {
                                    const { headers } = candidatePart;

                                    const isImage = candidatePart.contentType.startsWith("image");
//                                    const isInline = (headers && headers["content-disposition"] && headers["content-disposition"].length > 0 && headers["content-disposition"][0].startsWith("inline"));

                                    if(isImage /* || isInline */) {
                                        const imageContentType = headers["content-type"];

                                        if(imageContentType && imageContentType.length > 0) {
                                            const imageTokens = imageContentType[0].split(";");

                                            if(imageTokens.length > 1) {
                                                const imageNameTokens = imageTokens[1].split("=");
                        
                                                if(imageNameTokens.length > 1 && imageNameTokens[0].trim() == "name") {
                                                    const imageName = imageNameTokens[1].replace(quoteReplace, "");

                                                    if(!isImage) {
                                                        console.log(imageContentType);

                                                        if(headers["content-transfer-encoding"] && headers["content-transfer-encoding"].length > 0) {
                                                            if(headers["content-transfer-encoding"][0].toLowerCase() !== "base64") {
                                                                continue;
                                                            }
                                                        }
                                                    }

                                                    const embed = {
                                                        messageId: messageId,
                                                        originalFilename: imageName,
                                                        outputFilename: null,
                                                        date: date,
                                                        partName: candidatePart.partName,
                                                        contentTypeBoundary: imageContentType[0],
                                                        boundary: boundary,
                                                        contentType: imageTokens[0],
                                                        size: null,
                                                        extension: "--",
                                                        isEmbed: true,
                                                        isPreviewable: false,
                                                        isDuplicate: false
                                                    };

                                                    embeds.push(embed);
                                                }
                                            }
                                        }
                                    }
                                    else if(candidatePart.parts) {
                                        this.identifyEmbeds(messageId, date, candidatePart.parts, embeds);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            else if(part.parts) {
                this.identifyEmbeds(messageId, date, part.parts, embeds);
            }
        }

        return embeds;
    }

    static async getFileText(messageId) {
        const file = await messenger.messages.getRaw(messageId, { "data_format": "File" });
        const result = await file.text();

        return result;
    }

    static async getDecodedFileText(messageId, messageCharset) {
        const result = {
            success: false,
            text: null
        };

        const rawFile = await messenger.messages.getRaw(messageId);

        const buffer = new Uint8Array(rawFile.length);

        for(let i = 0; i < rawFile.length; i++) {
            buffer[i] = rawFile.charCodeAt(i) & 0xFF;
        }

        try {
            const decoder = new TextDecoder(messageCharset);

            result.text = decoder.decode(buffer);

            result.success = true;

        }
        catch(e) {
            // Error logged in extractEmbeds
        }

        return result;
    }

    static async extractEmbeds(messageId, embeds, messageCharset) {
        let text;

        if(messageCharset == null) {
            text = await this.getFileText(messageId, messageCharset);
        }
        else {
            const getDecodedFileTextResult = await this.getDecodedFileText(messageId, messageCharset);

            if(getDecodedFileTextResult.success) {
                text = getDecodedFileTextResult.text;
            }
            else {
                for(const embed of embeds) {
                    embed.error = messenger.i18n.getMessage("embedErrorUnableToReadFile", [embed.name]);
                }

                return;
            }
        }

        let
            startIndex = 0,
            lastEndIndex = 0,
            lastFileName = "";

        if(embeds.length > 2) {
            embeds = embeds.sort((a, b) => (a.name < b.name) ? -1 : ((a.name > b.name) ? 1 : 0));
        }

        for(const embed of embeds) {
            if(embed.name !== lastFileName) {
                lastEndIndex = 0;
            }

            const contentTypeHeaderRegexString = `Content-Type: ${embed.contentTypeBoundary}`
                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                .replace(/;.s*/, ";\\s*")
            ;

            startIndex = text.substring(lastEndIndex).search(new RegExp(contentTypeHeaderRegexString));

            if(startIndex > -1) {
                startIndex += lastEndIndex;

                let endIndex = text.indexOf(embed.boundary, startIndex);

                if(endIndex == -1) {
                    endIndex = text.length;
                }

//                if(endIndex > -1) {
                    let lines = text.substring(startIndex, endIndex).split("\r\n");

                    const extractResult = this.extractBase64(lines);

                    if(extractResult.success) {
                        embed.decodeData = this.decodeBase64(extractResult.value, extractResult.padCount, this.decodeChecksum);
                        embed.size = embed.decodeData.data.length;
                    }
                    else {
                        embed.error = messenger.i18n.getMessage("embedErrorInvalidBase64", [embed.originalFilename]);
                    }

                    lastEndIndex = endIndex;
//                }
//                else {
//                    embed.error = messenger.i18n.getMessage("embedErrorLowerBoundaryMissing", [embed.name]);
//                }
            }
            else {
                embed.error = messenger.i18n.getMessage("embedContentTypeMissing", [embed.originalFilename]);
            }

            lastFileName = embed.originalFilename;
        }       
    }

    static extractBase64(lines) {
        const result = {
            success: false,
            value: null,
            padCount: 0
        };

        let
            startIndex = 0,
            endIndex = lines.length - 1,        // Exclusive
            cumulativeLength = 0;

        for(let i = 1; i < lines.length; i++) {
            if(lines[i].length == 0) {
                startIndex = i + 1;

                while(++i < endIndex) {
                    const line = lines[i];

                    if(line.length == 0) {
                        endIndex = i;
                        break;
                    }

                    cumulativeLength += line.length;
                }

                break;
            }
        }

        if(cumulativeLength > 0 && cumulativeLength % 4 == 0)
        {
            result.value = new Uint8Array(cumulativeLength);

            let
                value = result.value,
                offset = 0,
                currentIndex,
                currentChar,
                currentValue;

            for(let i = startIndex; i < endIndex; i++) {
                const line = lines[i];

                for(let j = 0; j < line.length; j++) {
                    currentIndex = j + offset;
                    currentChar = line[j];
                    currentValue = this.base64Map.get(currentChar);

                    if(currentValue === undefined) {
                        return result;
                    }
                    else if(currentValue == 64) {                       // Pad character
                        const absolutePosition = currentIndex % 4;

                        if(absolutePosition < 2) {
                            return result;
                        }

                        if(absolutePosition == 2 && !(j + 1 < line.length && line[j + 1] === "=")) {
                            return result;
                        }

                        result.padCount++;
                    }

                    value[currentIndex] = currentValue;
                }

                offset += line.length;
            }

            result.success = true;
        }

        return result;
    }
}