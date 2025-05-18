export const xmlFileReader = async (file) => {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();

        // Read the file as text
        reader.onload = (event) => {
            // Preprocess XML to remove whitespace between tags
            // This preserves whitespace inside tags but removes it between tags
            const xmlData = event.target.result.replace(/>\s+</g, '><');
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlData, "application/xml");

            // Check for XML parsing errors
            const parserError = xmlDoc.getElementsByTagName("parsererror");
            if (parserError.length > 0) {
                reject(new Error("Invalid XML format"));
            } else {
                resolve(xmlDoc); // Resolve with the parsed XML document
            }
        };

        reader.onerror = (error) => {
            reject(error); // Reject if there's an error reading the file
        };

        // Start reading the file
        reader.readAsText(file);
    });
};