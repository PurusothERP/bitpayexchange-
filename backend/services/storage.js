const sdk = require('@pinata/sdk');
const pinata = new sdk(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);
const stream = require('stream');
const sharp = require('sharp');

async function uploadLogo(tokenAddress, fileBuffer, fileName) {
    try {
        console.log(`[Storage] Processing logo for ${tokenAddress}...`);
        
        // 1. Resize and compress using sharp (PNG for transparency support in Web3/Trust Wallet)
        let processedBuffer = await sharp(fileBuffer)
            .resize(256, 256, { 
                fit: 'contain', 
                background: { r: 255, g: 255, b: 255, alpha: 0 } 
            })
            .png({ 
                compressionLevel: 9, 
                adaptiveFiltering: true,
                palette: true,
                colors: 128
            })
            .toBuffer();

        // 2. If somehow still > 10kb (unlikely for 256px palette PNG), reduce colors further
        if (processedBuffer.length > 10240) {
            console.log(`[Storage] Logo still > 10kb (${(processedBuffer.length/1024).toFixed(1)}kb), aggressive compression...`);
            processedBuffer = await sharp(processedBuffer)
                .png({ palette: true, colors: 64, compressionLevel: 9 })
                .toBuffer();
        }

        console.log(`[Storage] Final logo size: ${(processedBuffer.length/1024).toFixed(1)}kb`);

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
