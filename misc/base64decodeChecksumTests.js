class tests {
    
    static decodeChecksum01(source, buffer) {
        const checksumMask9 = 0b111111111;

        let
            i,          // Source index
            j = 0,      // Result index
            e2,
            e3,
            
            checksum = (0b1010000 | (buffer.length & 0x0F)) << 24;
/*
        const primeTable = EmbedManager.primeTable;

        const addPrime = (value, index) => {
            return primeTable[value] * primeTable[index & 0xFF];
        };
*/

        for (i = 0; i < source.length; i += 4) {
            e2 = source[i + 1];
            e3 = source[i + 2];

            buffer[j] = (source[i] << 2) | (e2 >> 4);
            checksum ^= (buffer[j] + source[++j]) << 16;      // + addPrime(buffer[++j], j);

            buffer[j] = ((e2 & 0b00001111) << 4) | (e3 >> 2);
            checksum ^= (buffer[j] + source[++j]) << 8;       // + addPrime(buffer[++j], j)

            buffer[j] = ((e3 & 0b00000011) << 6) | (source[i + 3] & 0b00111111);
            checksum ^= (buffer[j] + source[++j]);            // + addPrime(buffer[++j], j)

            checksum = (checksum << 9) | ((checksum >>> 23) & checksumMask9);

//            checksum = ((checksum ^ (buffer[j] + buffer[++j])) << 9) | ((checksum >>> 23) & checksumMask9);          

//            checksum = (checksum ^ (buffer[j] + addPrime(buffer[++j], j)) << 9) | ((checksum >>> 23) & checksumMask9);
        }

        return checksum;
    }

    static decodeBase64Swap2(source, index1, byte1, index2, byte2) {
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

//        const checksumMask9 = 0b111111111 << 23;

        let
            i,          // Source index
            j = 0,      // Result index
            e2,
            e3,
            
            checksum = (0b1010000 | (bufferLength & 0x0F)) << 24;
        
        for (i = 0; i < sourceLength; i += 4) {
            e2 = source[i + 1];
            e3 = source[i + 2];

            buffer[j] = (i === index1) ? byte1 : (source[i] << 2) | (e2 >> 4);
            checksum ^= buffer[j++] << 16;

            buffer[j] = (i === index2 && byte2 !== undefined) ? byte2 : ((e2 & 0b00001111) << 4) | (e3 >> 2);
            checksum ^= (0 ^ buffer[j++]) << 8;

            buffer[j] = ((e3 & 0b00000011) << 6) | (source[i + 3] & 0b00111111);
            checksum = ((checksum >>> 23) | ((checksum ^ buffer[j++]) << 9)) + source[j];
        }

        return {
            data: buffer.subarray(0, bufferLength - padLength),
            checksum: checksum
        };
    }

    static testDecode1() {
        const map = new Set();

        for(let i = 63; i > -1; i--) {
            for(let j = 3; j > -1; j--) {
                const buffer = new Uint8Array([i, j << 4, 64, 64]);

                const checksum = this.decodeBase64(buffer).checksum;

                if(map.has(checksum)) {
                    console.log(checksum);
                }
                else {
                    map.add(checksum);
                }
            }
        }

        console.log(map.size);
    }

    static testDecode2() {
        const map = new Set();

        for(let i = 63; i > -1; i--) {
            for(let j = 63; j > -1; j--) {
                for(let k = 15; k > -1; k--) {
                    const buffer = new Uint8Array([i, j, k << 2, 64]);

                    const checksum = this.decodeBase64(buffer).checksum;

                    if(map.has(checksum)) {
                        console.log(checksum);
                    }
                    else {
                        map.add(checksum);
                    }
                }
            }
        }

        console.log(map.size);
    }

    static testDecode3() {
        const map = new Set();

        for(let i = 63; i > -1; i--) {
            for(let j = 63; j > -1; j--) {
                for(let k = 63; k > -1; k--) {
                    for(let l = 63; l > -1; l--) {
                        const buffer = new Uint8Array([i, j, k, l]);

                        const checksum = this.decodeBase64(buffer).checksum;

                        if(map.has(checksum)) {
                            console.log(checksum);
                        }
                        else {
                            map.add(checksum);
                        }
                    }
                }
            }
        }
/*
        for(const item of map.entries()) {
            if( item[1].val > 1) {
                console.log(`${item[0]} : ${item[1].val }`);
            }
        }
*/

        console.log(map.size);
    }    

    static testChecksum() {
        const buffer = new Uint8Array(99);
//        const checksumMask9 = 0b111111111 << 23;

        window.crypto.getRandomValues(buffer);

        const map = new Map();

        for(let i = 0; i < 256; i++) {
            for(let j = 0; j < 256; j++) {
                let checksum = (0b1010000 | (buffer.length & 0x0F)) << 24;

                buffer[0] = i;
                buffer[96] = j;

                let k = 0;

                while(k < buffer.length) {
                    checksum ^= buffer[k++] << 16;
                    checksum ^= buffer[k++] << 8;
                    checksum = ((checksum ^ buffer[k++]) << 9) | (checksum >>> 23) ;
                }

                if(map.has(checksum)) {
                    map.get(checksum).push([i, j]);
                }
                else {
                    map.set(checksum, [[i, j]]);
                }
            }

        }

        console.log(map.size);
    }

    static testChecksum2() {
        const exec = this.decodeChecksumSimple;

        this.testChecksum2Inner(99, 0, 96, false, exec);
        this.testChecksum2Inner(99, 0, 96, true, exec);

        this.testChecksum2Inner(99, 2, 98, false, exec);
        this.testChecksum2Inner(99, 2, 98, true, exec);

        this.testChecksum2Inner(99, 0, 1, false, exec);
        this.testChecksum2Inner(99, 0, 1, true, exec);

        this.testChecksum2Inner(99, 0, 3, false, exec);
        this.testChecksum2Inner(99, 0, 3, true, exec);

        this.testChecksum2Inner(99, 2, 3, false, exec);
        this.testChecksum2Inner(99, 2, 3, true, exec);

        this.testChecksum2Inner(48003, 0, 96, false, exec);
        this.testChecksum2Inner(48003, 0, 96, true, exec);

        this.testChecksum2Inner(48003, 2, 98, false, exec);
        this.testChecksum2Inner(48003, 2, 98, true, exec);

        this.testChecksum2Inner(48003, 47006, 48002, false, exec);
        this.testChecksum2Inner(48003, 47006, 48002, true, exec);
    }


    static testChecksum2Inner(bufferLength, index1, index2, useRandom, exec) {
        console.log(`Length: ${bufferLength}; index 1: ${index1}; index 2: ${index2}; randomize: ${useRandom}`);

//        const bufferLength = 99;
        const encodedLength = bufferLength * 4 / 3;

        const sourceBuffer = new Uint8Array(bufferLength);

        const map = new Map();

        for(let x = 0; x < 1; x++) {
            if(useRandom) {
                window.crypto.getRandomValues(sourceBuffer);
            }

            for(let i = 0; i < 256; i++) {
                for(let j = 0; j < 256; j++) {
//                    window.crypto.getRandomValues(sourceBuffer);
                     sourceBuffer[index1] = i;
                     sourceBuffer[index2] = j;

                    const encodedBuffer = new Uint8Array(encodedLength);

                    let p = 0;

                    for(let q = 0; q < bufferLength; q += 3) {
                        // Left six bits of byte 1
                        encodedBuffer[p++] = sourceBuffer[q] >> 2;
                        
                        // Right 2 bits of byte 1 | left 4 bits of byte 2
                        encodedBuffer[p++] = ((sourceBuffer[q] & 0b00000011) << 4) | (sourceBuffer[q + 1] >> 4);
                        
                        // Right 4 bits of byte 2 | left 2 bits of byte 3
                        encodedBuffer[p++] = ((sourceBuffer[q + 1] & 0b00001111) << 2) | (sourceBuffer[q + 2] >> 6);
                        
                        // Right six bits if byte 3
                        encodedBuffer[p++] = sourceBuffer[q + 2] & 0b00111111;
                    }

                    const result = this.decodeBase64(encodedBuffer, exec);

                    const checksum = result.checksum;

                    if(map.has(checksum)) {
                        map.get(checksum).push([i, j]);
                    }
                    else {
                        map.set(checksum, [[i, j]]);
                    }
                }

            }

            console.log(map.size);

            map.clear();
        }
    }
}
