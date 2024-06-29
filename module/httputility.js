export class HttpUtility {
    static async head(url, count = 0) {

        count++;
        
        if(count > 10) {
            return null;
        }

        let response;

        try {
            response = await fetch(url, { method:"HEAD", headers: { "Access-Control-Allow-Origin": "*" } });
        }
        catch {
            return null;
        }

        if(response = null) {
            return null;
        }

        switch (response.status) {
            case 200:
                return response;
            case 301:
            case 302:
            case 307:
            case 308:
                return await this.head(response.location, count);
            default:
                return null;
        }

    }
}