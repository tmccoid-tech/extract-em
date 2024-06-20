export class HttpUtility {
    static async getLength(url) {
        let result = {
            success: false,
            length: 0
        }
        
        const response = await this.#head(url);

        if(response && response.headers.has("content-length")) {
            result.length = parseInt(response.headers.get("content-length"));
            result.success = true;
        }

        return result;
    }

    static async #head(url) {
        let response = null;

        try {
            response = await fetch(url, { method: "HEAD" } );
        }
        catch(e) {
            console.log(e);
        }

        if(response == null || response.status != 200) {
            return null;
        }

        return response;
    }

    static async fetch(url, filename, reportProgress) {
        let result = {
            success: false,
            file: null
        };

        let response = null;

        try {
            response = await fetch(url);
        }
        catch {
            console.log(e);

            return result;
        }

        if(response.status == 200) {
            const mimeType = response.headers.get("content-type");
            const contentLength = parseInt(response.headers.get("content-length"));
            const lastModified = new Date(response.headers.get("last-modified")).getTime();

            const receiveBuffer = new Uint8Array(contentLength);
            let receivedLength = 0;

            const progressInfo = {
                status: "started",
                host: new URL(url).origin,
                filename: filename,
                receivedLength: receivedLength,
                contentLength: contentLength
            };

            reportProgress(progressInfo);

            progressInfo.status = "receiving";

            const reader = response.body.getReader();

            while(true) {
                const { done: completed, value: data } = await reader.read();

                if(completed) {
                    progressInfo.status = "complete";

                    reportProgress(progressInfo);

                    break;
                }

                receiveBuffer.set(data, receivedLength);

                receivedLength += data.length;

                progressInfo.receivedLength = receivedLength;

                reportProgress(progressInfo);
            }

            result.success = true;
            result.file = new File([receiveBuffer.buffer], filename, { type: mimeType, lastModified: lastModified });
        }

        return result;
    }
}