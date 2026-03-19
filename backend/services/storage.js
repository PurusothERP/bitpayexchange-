const sdk = require('@pinata/sdk');
const pinata = new sdk(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);
const stream = require('stream');

async function uploadLogo(tokenAddress, fileBuffer, fileName) {
    try {
        const readableStreamForFile = new stream.PassThrough();
        readableStreamForFile.end(fileBuffer);

        const options = {
            pinataMetadata: {
                name: `logo_${tokenAddress}`,
                keyvalues: {
                    tokenAddress: tokenAddress
                }
            }
        };

        const result = await pinata.pinFileToIPFS(readableStreamForFile, options);
        return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
    } catch (error) {
        console.error('Error uploading logo to Pinata:', error);
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
