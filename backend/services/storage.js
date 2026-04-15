const sdk = require('@pinata/sdk');
const pinata = new sdk(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);
const stream = require('stream');
const sharp = require('sharp');

async function uploadLogo(tokenAddress, fileBuffer, fileName) {
    try {
        console.log(`[Storage] Processing logo for ${tokenAddress}...`);
        
        // 1. Resize and compress using sharp (PNG with palette optimization for Web3/Trust Wallet)
        let processedBuffer = await sharp(fileBuffer)
            .resize(256, 256, { 
                fit: 'contain', 
                background: { r: 255, g: 255, b: 255, alpha: 0 } 
            })
            .png({ 
                compressionLevel: 9, 
                adaptiveFiltering: true,
                palette: true,
                colors: 128,
                dither: 0
            })
            .toBuffer();

        // 2. STRICTOR ENFORCEMENT for Web3/Trust Wallet compatibility (<10kb)
        if (processedBuffer.length > 10240) {
            console.log(`[Storage] Logo still > 10kb (${(processedBuffer.length/1024).toFixed(1)}kb), dropping colors to 64...`);
            processedBuffer = await sharp(processedBuffer)
                .png({ palette: true, colors: 64, compressionLevel: 9, dither: 0 })
                .toBuffer();
        }

        if (processedBuffer.length > 10240) {
            console.log(`[Storage] Logo still over limits, dropping to 128x128 resolution...`);
            processedBuffer = await sharp(processedBuffer)
                .resize(128, 128)
                .png({ palette: true, colors: 64, compressionLevel: 9, dither: 0 })
                .toBuffer();
        }

        if (processedBuffer.length > 10240) {
            console.log(`[Storage] Final attempt: 64x64 resolution and 32 colors...`);
            processedBuffer = await sharp(processedBuffer)
                .resize(64, 64)
                .png({ palette: true, colors: 32, compressionLevel: 9, dither: 0 })
                .toBuffer();
        }

        // Final sanity check, if still over 10KB (unlikely), use JPEG with high compression as absolute fallback
        // though PNG is preferred for transparency.
        if (processedBuffer.length > 10240) {
            console.log(`[Storage] ABSOLUTE FALLBACK: Using high-compression JPEG 64x64`);
            processedBuffer = await sharp(processedBuffer)
                .resize(64, 64)
                .jpeg({ quality: 60, chromaSubsampling: '4:2:0' })
                .toBuffer();
        }

        console.log(`[Storage] Final optimized logo size: ${(processedBuffer.length/1024).toFixed(1)}kb`);

        const readableStreamForFile = new stream.PassThrough();
        readableStreamForFile.end(processedBuffer);

        const options = {
            pinataMetadata: {
                name: `logo_${tokenAddress}_256`,
                keyvalues: {
                    tokenAddress: tokenAddress,
                    processed: 'true'
                }
            }
        };

        const result = await pinata.pinFileToIPFS(readableStreamForFile, options);
        return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
    } catch (error) {
        console.error('Error processing or uploading logo to Pinata:', error);
        throw error;
    }
}

async function uploadMetadata(tokenAddress, metadata) {
    try {
        const options = {
            pinataMetadata: {
                name: `metadata_${tokenAddress}`,
                keyvalues: {
                    tokenAddress: tokenAddress
                }
            }
        };

        const result = await pinata.pinJSONToIPFS(metadata, options);
        return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
    } catch (error) {
        console.error('Error uploading metadata to Pinata:', error);
        throw error;
    }
}

module.exports = {
    uploadLogo,
    uploadMetadata
};
