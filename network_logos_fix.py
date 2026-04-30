import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# Reliable logo mapping for networks
logo_mapping = """
const getNetworkLogo = (net) => {
    const mapping = {
        'BNB': 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
        'ETH': 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
        'SOL': 'https://cryptologos.cc/logos/solana-sol-logo.png',
        'BASE': 'https://raw.githubusercontent.com/base-org/brand-kit/main/logo/symbol/Base_Symbol_Blue.png',
        'TRON': 'https://cryptologos.cc/logos/tron-trx-logo.png',
        'SUI': 'https://cryptologos.cc/logos/sui-sui-logo.png',
        'TON': 'https://cryptologos.cc/logos/toncoin-ton-logo.png',
        'ARBITRUM': 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
        'OPTIMISM': 'https://cryptologos.cc/logos/optimism-ethereum-op-logo.png',
        'POLYGON': 'https://cryptologos.cc/logos/polygon-matic-logo.png',
        'AVALANCHE': 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
        'FANTOM': 'https://cryptologos.cc/logos/fantom-ftm-logo.png',
        'BLAST': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/blast/info/logo.png',
        'CELO': 'https://cryptologos.cc/logos/celo-celo-logo.png',
        'CYBER': 'https://assets.coingecko.com/coins/images/30349/large/CyberConnect_Logo.png',
        'SCROLL': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/scroll/info/logo.png',
        'SONIC': 'https://assets.coingecko.com/coins/images/37343/large/sonic.png',
        'ZETACHAIN': 'https://assets.coingecko.com/coins/images/28362/large/zetachain.png'
    };
    return mapping[net.toUpperCase()] || 'https://cryptologos.cc/logos/bnb-bnb-logo.png';
};
"""

# Find a place to insert the logo mapping (before NetPill)
if 'const getNetworkLogo' not in content:
    content = content.replace('const NetPill =', logo_mapping + '\nconst NetPill =')

# Update NetPill to use the mapping
content = content.replace(
    'src={`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${net === \'BNB\' ? \'smartchain\' : net.toLowerCase()}/info/logo.png`}',
    'src={getNetworkLogo(net)}'
)

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: Network logos updated with reliable sources.")
