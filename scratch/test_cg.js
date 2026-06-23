async function testCG() {
    const url = 'https://demo-api.coingecko.com/api/v3/coins/list?include_platform=true';
    const apiKey = 'CG-Lw5hZVvgRLEpJDKdcnq3Qywc';
    
    console.log('Fetching CoinGecko coin list...');
    try {
        const res = await fetch(url, {
            headers: {
                'x-cg-demo-api-key': apiKey,
                'Accept': 'application/json'
            }
        });
        
        console.log('Response status:', res.status);
        if (!res.ok) {
            const txt = await res.text();
            console.log('Response body:', txt);
            return;
        }
        
        const data = await res.json();
        console.log('Total coins in list:', data.length);
        if (data.length > 0) {
            console.log('Sample coin:', JSON.stringify(data[0], null, 2));
            console.log('Sample coin 1000:', JSON.stringify(data[Math.min(1000, data.length - 1)], null, 2));
        }
    } catch (e) {
        console.error('Error fetching CoinGecko:', e);
    }
}

testCG();
