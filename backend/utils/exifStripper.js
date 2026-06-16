// ═══════════════════════════════════════════════════════════════
// Pure JS JPEG EXIF metadata stripper
// Strips APP1 segment (GPS, Camera info, device details)
// ═══════════════════════════════════════════════════════════════

/**
 * Strips APP1 EXIF segment (0xFFE1 marker) from a raw JPEG buffer.
 * Returns a sanitized buffer if it is a JPEG, otherwise returns the original buffer.
 * 
 * @param {Buffer} buffer - Raw file buffer
 * @returns {Buffer} - Sanitized file buffer
 */
export function stripJpegExif(buffer) {
    try {
        if (!buffer || buffer.length < 4 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
            // Not a JPEG image, return original
            return buffer;
        }

        let i = 2;
        const resultChunks = [buffer.subarray(0, 2)]; // Start with SOI (FF D8)

        while (i < buffer.length) {
            // Find marker segment
            if (buffer[i] === 0xFF) {
                // Skip duplicate FFs (standard JPEG padding)
                while (buffer[i] === 0xFF && i < buffer.length) {
                    i++;
                }
                
                if (i >= buffer.length) break;
                
                const marker = buffer[i];
                i++;
                
                // Read length of marker segment
                if (i + 2 > buffer.length) break;
                const length = buffer.readUInt16BE(i);
                
                // APP1 marker is EXIF (0xE1). If we see it, we skip it entirely!
                if (marker === 0xE1) {
                    i += length; // Skip the length bytes and the segment data
                    continue;
                }
                
                // For any other markers (like APP0 JFIF, SOF, DHT, etc.), we retain the segment
                const segmentStart = i - 2; // Include the marker identifier (FF marker)
                const segmentEnd = i + length; // Include the segment length and data payload
                
                if (segmentEnd <= buffer.length) {
                    resultChunks.push(buffer.subarray(segmentStart, segmentEnd));
                }
                i += length;
            } else {
                // If not in a marker segment, copy data forward
                const start = i;
                while (i < buffer.length && buffer[i] !== 0xFF) {
                    i++;
                }
                resultChunks.push(buffer.subarray(start, i));
            }
        }
        
        return Buffer.concat(resultChunks);
    } catch (err) {
        console.error("[EXIF STRIPPER ERROR] Stripping failed, returning original buffer:", err.message);
        return buffer;
    }
}
