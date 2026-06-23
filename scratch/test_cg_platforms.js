async function testCGPlatforms() {
    const apiKey = 'CG-Lw5hZVvgRLEpJDKdcnq3Qywc';
    const url = 'https://api.coingecko.com/api/v3/coins/list?include_platform=true';
    
    try {
        const res = await fetch(url, {
            headers: {
                'x-cg-demo-api-key': apiKey,
                'Accept': 'application/json'
            }
        });
        const data = await res.json();
        const coinsWithPlatforms = data.filter(t => t.platforms && Object.keys(t.platforms).length > 0);
        console.log('Total coins in list:', data.length);
        console.log('Total coins with platforms:', coinsWithPlatforms.length);
        if (coinsWithPlatforms.length > 0) {
            console.log('Sample platform coin 1:', JSON.stringify(coinsWithPlatforms[0], null, 2));
            console.log('Sample platform coin 2:', JSON.stringify(coinsWithPlatforms[100], null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}
testCGPlatforms();
