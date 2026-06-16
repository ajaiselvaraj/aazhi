// ═══════════════════════════════════════════════════════════════
// Secure Evidence Watermarking Utility (Metadata-based & Plaintext Injection)
// ═══════════════════════════════════════════════════════════════

/**
 * Watermarks a file buffer on-the-fly depending on the mimetype.
 * Embeds case code, officer username, and export timestamp.
 * 
 * @param {Buffer} buffer The decrypted file buffer
 * @param {string} mimetype The file's MIME type
 * @param {string} caseCode The unique report case code
 * @param {string} officerUsername The exporting officer's username
 * @returns {Buffer} The watermarked buffer
 */
export function watermarkBuffer(buffer, mimetype, caseCode, officerUsername) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        return buffer;
    }

    const timestamp = new Date().toISOString();
    const watermarkText = `CONFIDENTIAL WATERMARK - Case Code: ${caseCode} | Officer: ${officerUsername} | Timestamp: ${timestamp}`;

    try {
        if (mimetype.startsWith("text/") || mimetype === "application/json" || mimetype === "text/csv") {
            const content = buffer.toString("utf8");
            const separator = mimetype === "text/csv" ? "\n" : "\n\n";
            return Buffer.from(content + separator + watermarkText, "utf8");
        } 
        
        if (mimetype === "application/pdf") {
            // Inject PDF metadata and trailing comments
            const pdfString = buffer.toString("binary");
            const watermarkInfo = `/Watermark (${watermarkText})`;
            let updatedPdf = pdfString;
            
            const infoIndex = pdfString.indexOf("/Info");
            if (infoIndex !== -1) {
                const dictEnd = pdfString.indexOf(">>", infoIndex);
                if (dictEnd !== -1) {
                    updatedPdf = pdfString.substring(0, dictEnd) + " " + watermarkInfo + pdfString.substring(dictEnd);
                }
            }
            
            // Append trailing forensic signature
            updatedPdf += `\n% ${watermarkText}\n`;
            return Buffer.from(updatedPdf, "binary");
        } 
        
        if (mimetype.startsWith("image/jpeg") || mimetype.startsWith("image/jpg")) {
            // Inject JPEG COM segment right after SOI marker
            const textBuffer = Buffer.from(watermarkText, "utf8");
            const length = textBuffer.length + 2;
            const comHeader = Buffer.alloc(4);
            comHeader[0] = 0xFF;
            comHeader[1] = 0xFE;
            comHeader[2] = (length >> 8) & 0xFF;
            comHeader[3] = length & 0xFF;

            if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
                return Buffer.concat([
                    buffer.subarray(0, 2),
                    comHeader,
                    textBuffer,
                    buffer.subarray(2)
                ]);
            }
            return Buffer.concat([buffer, Buffer.from(`\n/* ${watermarkText} */\n`)]);
        } 
        
        if (mimetype.startsWith("image/png")) {
            // Inject PNG tEXt chunk
            const keyword = "Watermark\0";
            const textBuffer = Buffer.from(keyword + watermarkText, "utf8");
            const lenBuf = Buffer.alloc(4);
            lenBuf.writeUInt32BE(textBuffer.length, 0);
            const typeBuf = Buffer.from("tEXt", "ascii");
            
            // Standard static CRC for fallback PNG readers
            const crcBuf = Buffer.alloc(4);
            crcBuf.writeUInt32BE(0, 0);

            const chunk = Buffer.concat([lenBuf, typeBuf, textBuffer, crcBuf]);

            if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
                return Buffer.concat([
                    buffer.subarray(0, 8),
                    chunk,
                    buffer.subarray(8)
                ]);
            }
            return Buffer.concat([buffer, Buffer.from(`\n/* ${watermarkText} */\n`)]);
        }

        // Generic binary file watermark: append trailing ASCII comments
        return Buffer.concat([buffer, Buffer.from(`\n/* ${watermarkText} */\n`)]);
    } catch (err) {
        console.error(`[Watermarking Error] Failed to stamp file: ${err.message}`);
        return buffer;
    }
}
