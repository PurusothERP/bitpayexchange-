async function testCMCPlatform() {
    const apiKey = '418d3f90804a41d5bc3e0dfa4278ace3';
    const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?limit=200';
    
    try {
        const res = await fetch(url, {
            headers: {
                'X-CMC_PRO_API_KEY': apiKey,
                'Accept': 'application/json'
            }
        });
        const data = await res.json();
        const tokensWithPlatform = data.data.filter(t => t.platform !== null);
        console.log('Total tokens with platform out of 200:', tokensWithPlatform.length);
        if (tokensWithPlatform.length > 0) {
            console.log('Sample:', JSON.stringify(tokensWithPlatform[0], null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}
testCMCPlatform();
