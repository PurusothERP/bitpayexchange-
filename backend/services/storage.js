/**
 * B20 Storage Service
 * 
 * Priority:
 * 1. Save logo locally to /public/logos/ (always works, instant)
 * 2. Upload to Pinata IPFS in background (for Trust Wallet / metadata)
 * 
 * The local URL is always returned as logo_url so the frontend never
 * shows a broken image due to IPFS gateway timeouts.
 */

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Local logos directory — served statically by Express
const LOGOS_DIR = path.join(__dirname, '../public/logos');
if (!fs.existsSync(LOGOS_DIR)) {
    fs.mkdirSync(LOGOS_DIR, { recursive: true });
}

// Backend base URL for local logo serving
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * Optimizes an image buffer to meet Trust Wallet specs (<10KB, 256x256 PNG).
 */
async function optimizeImage(fileBuffer) {
    // Try 256x256 first
    let processed = await sharp(fileBuffer)
        .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true, colors: 128, dither: 0 })
        .toBuffer();

    if (processed.length > 10240) {
        processed = await sharp(processed).png({ palette: true, colors: 64, compressionLevel: 9, dither: 0 }).toBuffer();
    }
    if (processed.length > 10240) {
        processed = await sharp(processed).resize(128, 128).png({ palette: true, colors: 64, compressionLevel: 9, dither: 0 }).toBuffer();
    }
    if (processed.length > 10240) {
        processed = await sharp(processed).resize(64, 64).png({ palette: true, colors: 32, compressionLevel: 9, dither: 0 }).toBuffer();
    }
    if (processed.length > 10240) {
        processed = await sharp(processed).resize(64, 64).jpeg({ quality: 60, chromaSubsampling: '4:2:0' }).toBuffer();
    }

    console.log(`[Storage] Optimized logo: ${(processed.length / 1024).toFixed(1)}kb`);
    return processed;
}

/**
 * Save logo locally + upload to Pinata in background.
 * Returns the LOCAL URL immediately for use as logo_url in the DB.
 */
async function uploadLogo(tokenAddress, fileBuffer, fileName) {
    try {
        const optimized = await optimizeImage(fileBuffer);

        // Determine file extension from optimized buffer
        const ext = optimized[0] === 0xff && optimized[1] === 0xd8 ? '.jpg' : '.png';
        const localFileName = `${tokenAddress.toLowerCase()}${ext}`;
        const localPath = path.join(LOGOS_DIR, localFileName);

        // Save locally — this ALWAYS works
        fs.writeFileSync(localPath, optimized);
        const localUrl = `${BACKEND_URL}/logos/${localFileName}`;
        console.log(`[Storage] ✅ Logo saved locally: ${localUrl}`);

        // Try Pinata in background (non-blocking)
        uploadToPinataBackground(tokenAddress, optimized, localFileName).catch(e =>
            console.warn('[Storage] Pinata background upload failed (non-critical):', e.message)
        );

        return localUrl;
    } catch (error) {
        console.error('[Storage] Logo processing error:', error.message);
        throw error;
    }
}

/**
 * Upload to Pinata IPFS in the background (for Trust Wallet submissions).
 * Updates the DB with the ipfs_logo_url if successful.
 */
async function uploadToPinataBackground(tokenAddress, buffer, fileName) {
    try {
        const sdk = require('@pinata/sdk');
        if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
            console.log('[Storage] Pinata credentials not set, skipping IPFS upload.');
            return null;
        }
        const pinata = new sdk(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);
        const stream = require('stream');
        const readable = new stream.PassThrough();
        readable.end(buffer);

        const result = await pinata.pinFileToIPFS(readable, {
            pinataMetadata: {
                name: `logo_${tokenAddress}_256`,
                keyvalues: { tokenAddress, processed: 'true' }
            }
        });
        const ipfsUrl = `https://ipfs.io/ipfs/${result.IpfsHash}`;
        console.log(`[Storage] ✅ Pinata IPFS uploaded: ${ipfsUrl}`);

        // Update DB with IPFS URL as secondary field
        const db = require('../config/db');
        await db.query(
            `UPDATE tokens SET ipfs_logo_url = ? WHERE LOWER(contract_address) = LOWER(?)`,
            [ipfsUrl, tokenAddress]
        ).catch(e => console.warn('[Storage] DB ipfs_logo_url update failed:', e.message));

        return ipfsUrl;
    } catch (e) {
        console.warn('[Storage] Pinata upload failed:', e.message);
        return null;
    }
}

/**
 * Upload metadata JSON to Pinata (for Trust Wallet / token lists).
 * Falls back gracefully if Pinata is unavailable.
 */
async function uploadMetadata(tokenAddress, metadata) {
    try {
        if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
            console.log('[Storage] Pinata credentials not set, skipping metadata upload.');
            return '';
        }
        const sdk = require('@pinata/sdk');
        const pinata = new sdk(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);
        const result = await pinata.pinJSONToIPFS(metadata, {
            pinataMetadata: {
                name: `metadata_${tokenAddress}`,
                keyvalues: { tokenAddress }
            }
        });
        return `https://ipfs.io/ipfs/${result.IpfsHash}`;
    } catch (error) {
        console.error('[Storage] Metadata upload failed (non-critical):', error.message);
        return ''; // Not critical — return empty string
    }
}

module.exports = { uploadLogo, uploadMetadata };
