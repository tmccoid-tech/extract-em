export class ZipEm {
    #useWebWorkers = false;
    #zipWriter;

    constructor(useWebWorkers = false) {
/*
        zip.configure({
            workerScripts: {
                deflate: ["/module/z-worker.js"]
            }
        });
*/

        this.#useWebWorkers = useWebWorkers;

        this.#zipWriter = new zip.ZipWriter(
            new zip.BlobWriter("application/zip"),
            { bufferedWrite: true, useCompressionStream: false }
        );
    }

    async addFile(fileName, fileData, creationDate) {
        await this.#zipWriter.add(
            fileName,
            new zip.BlobReader(fileData),
            { level: 0, lastModDate: creationDate, useWebWorkers: this.#useWebWorkers }
        );
    }

    async complete() {
        return await this.#zipWriter.close();
    }
}