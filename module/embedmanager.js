export class EmbedManager {
    static base64Map = new Map([..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"].map((c, i) => [c, i] ));

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


    static decodeBase64(source, decode) {
        let
            sourceLength = source.length,
            bufferLength = sourceLength * 0.75,
            padLength = 0;

        if (source[sourceLength - 1] === 64) {
            padLength++;
            if (source[sourceLength - 2] === 64) {
                padLength++;
            }
        }

        const buffer = new Uint8Array(bufferLength);

        const checksum = decode(source, buffer, padLength);

        return {
            data: buffer.subarray(0, bufferLength - padLength),
            checksum: checksum
        };
    }

    static decodeChecksum(source, buffer, padLength) {
        const checksumMask9 = 0b111111111;

        let
            i,                          // Source index
            j = 0,                      // Result index
            e2,
            e3,
            
            checksum = (0b10100000 | ((buffer.length - padLength) & 0x0F)) << 24;

        const primeTable = EmbedManager.primeTable;

        for (i = 0; i < source.length; i += 4) {
            e2 = source[i + 1];
            e3 = source[i + 2];

            buffer[j] = (source[i] << 2) | (e2 >> 4);
            checksum += (buffer[j] << 14) * primeTable[++j & 0xFF];

            buffer[j] = ((e2 & 0b00001111) << 4) | (e3 >> 2);
            checksum += (buffer[j] << 7) * primeTable[++j & 0xFF];

            buffer[j] = ((e3 & 0b00000011) << 6) | (source[i + 3] & 0b00111111);
            checksum += buffer[j] * primeTable[++j & 0xFF];

            checksum = (checksum << 9) | ((checksum >>> 23) & checksumMask9);
        }

        return checksum;
    }

    static identifyEmbeds(messageId, date, parts, embeds = []) {
        const quoteReplace = /["']/g;

        for (const part of parts) {
            if(part.contentType == "multipart/related") {
                const contentType = part.headers["content-type"];
                if(contentType && contentType.length > 0) {
                    const tokens = contentType[0].split(";");
                    if(tokens.length > 1) {

                        const boundaryToken = tokens[1].trim();

                        if(boundaryToken.startsWith("boundary=")) {

                            const boundary = boundaryToken.substring(9).replace(quoteReplace, "");

                            if(part.parts) {
                                for(const candidatePart of part.parts) {
                                    if(candidatePart.contentType.startsWith("image")) {
                                        const imageContentType = candidatePart.headers["content-type"];
                                        if(imageContentType && imageContentType.length > 0) {
                                            const imageTokens = imageContentType[0].split(";");
                                            if(imageTokens.length > 1) {
                                                const imageNameTokens = imageTokens[1].split("=");
                        
                                                if(imageNameTokens.length > 1 && imageNameTokens[0].trim() == "name") {
                                                    const imageName = imageNameTokens[1].replace(quoteReplace, "");

                                                    let extension = "--";

                                                    const segments = imageName.split(".");
                                    
                                                    if (segments.length > 1) {
                                                        if (segments[segments.length - 1].length < 6) {
                                                            extension = segments.pop().toLowerCase();
                                                        }
                                                    }

                                                    const embed = {
                                                        messageId: messageId,
                                                        name: imageName,
                                                        date: date,
                                                        partName: candidatePart.partName,
                                                        contentTypeBoundary: imageContentType[0],
                                                        boundary: boundary,
                                                        contentType: imageTokens[0],
                                                        size: null,
                                                        extension: extension,
                                                        isNested: false,
                                                        isEmbed: true,
                                                        isPreviewable: false
                                                    };

                                                    embeds.push(embed);
        
                                                    console.log(embed);
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

    static async extractEmbeds(messageId, embeds) {
        const text = await this.getFileText(messageId);

        let startIndex = 0;
        let lastEndIndex = 0;
        let lastFileName = "";

        if(embeds.length > 2) {
            embeds = embeds.sort((a, b) => (a.name < b.name) ? -1 : ((a.name > b.name) ? 1 : 0));
        }

        for(const embed of embeds) {
            const contentTypeHeaderRegexString = `Content-Type: ${embed.contentTypeBoundary}`
                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                .replace(/;.s*/, ";\\s*")
            ;

            startIndex = text.substring(lastEndIndex).search(new RegExp(contentTypeHeaderRegexString));

            if(startIndex > -1) {
                startIndex += lastEndIndex;

                const endIndex = text.indexOf(embed.boundary, startIndex);

                if(endIndex > -1) {
                    let lines = text.substring(startIndex, endIndex).split("\r\n");

                    const extractResult = this.extractBase64(lines);

                    if(extractResult.success) {
                        embed.decodeData = this.decodeBase64(extractResult.value, this.decodeChecksum);
                        embed.size = embed.decodeData.data.length;
                    }
                    else {
                        embed.error = `Invalid Base64 data in embed ${embed.name}.`;
                    }

                    lastEndIndex = (lastFileName == embed.name) ? endIndex : 0;
                    lastFileName = embed.name;
                }
                else {
                    embed.error = `Embed lower boundary not found (${embed.name}).`;
                }
            }
            else {
                embed.error = `Embed Content-Type header not found (${embed.name}).`;
            }
        }       
    }

    static extractBase64(lines) {
        const result = {
            success: false,
            value: null
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

        if(cumulativeLength > 0)
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
                        if(currentIndex > cumulativeLength - 3 && currentChar === "=") {
                            value[currentIndex] = 64;
                            
                            continue;
                        }
                        else {
                            return result;
                        }
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