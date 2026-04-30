import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# Improved fetchBalances with better error handling and fallback providers
old_fetch_balances = '''    // Balance Fetching Logic    // Fetch Real-time Balances
    const fetchBalances = async () => {
        if (!account) return;
        try {
            // Use active signer's provider for 0-latency live data, or fallback to high-speed RPC
            const activeProvider = signer?.provider || new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
            
            let fromBal = '0';
            let toBal = '0';

            // Optimized parallel fetch
            const fetchTasks = [];

            // From Asset
            if (fromToken?.address === '0x0000000000000000000000000000000000000000' || !fromToken?.address) {
                fetchTasks.push(activeProvider.getBalance(account).then(b => fromBal = ethers.formatEther(b)));
            } else {
                const c = new Contract(fromToken.address, ERC20_ABI, activeProvider);
                fetchTasks.push(c.balanceOf(account).then(b => fromBal = ethers.formatEther(b)));
            }

            // To Asset
            if (toToken?.address === '0x0000000000000000000000000000000000000000' || !toToken?.address) {
                fetchTasks.push(activeProvider.getBalance(account).then(b => toBal = ethers.formatEther(b)));
            } else {
                const c = new Contract(toToken.address, ERC20_ABI, activeProvider);
                fetchTasks.push(c.balanceOf(account).then(b => {
                     // Check if it's 18 decimals, if not we should handle but standard for these
                     toBal = ethers.formatEther(b);
                }));
            }

            await Promise.all(fetchTasks);

            setBalances({ 
                from: fromBal, 
                to: toBal 
            });
            
            // Sync BNB price for context
            if (toToken?.symbol === 'USDT' || fromToken?.symbol === 'USDT') {
                 activeProvider.getBalance('0x0000000000000000000000000000000000000000').catch(() => {});
            }

        } catch (err) {
            console.warn('Balance Engine Syncing...', err);
        }
    };'''

new_fetch_balances = '''    // High-Resilience Institutional Balance Engine
    const fetchBalances = async () => {
        if (!account) return;
        try {
            // Priority 1: Signer Provider (Wallet) | Priority 2: High-Speed RPC Fallback
            const publicProvider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
            const activeProvider = signer?.provider || publicProvider;
            
            let fromBal = balances.from;
            let toBal = balances.to;

            const getBalanceForToken = async (token, provider) => {
                try {
                    if (!token?.address || token.address === '0x0000000000000000000000000000000000000000') {
                        const b = await provider.getBalance(account);
                        return ethers.formatEther(b);
                    } else {
                        const c = new Contract(token.address, ERC20_ABI, provider);
                        const b = await c.balanceOf(account);
                        return ethers.formatEther(b);
                    }
                } catch (e) {
                    // If active provider fails, try public fallback immediately
                    if (provider !== publicProvider) {
                        try {
                            if (!token?.address || token.address === '0x0000000000000000000000000000000000000000') {
                                const b = await publicProvider.getBalance(account);
                                return ethers.formatEther(b);
                            } else {
                                const c = new Contract(token.address, ERC20_ABI, publicProvider);
                                const b = await c.balanceOf(account);
                                return ethers.formatEther(b);
                            }
                        } catch (e2) { return '0'; }
                    }
                    return '0';
                }
            };

            const [fB, tB] = await Promise.all([
                getBalanceForToken(fromToken, activeProvider),
                getBalanceForToken(toToken, activeProvider)
            ]);

            setBalances({ from: fB, to: tB });
            
        } catch (err) {
            console.warn('[Balance Engine] Sync inhibited:', err.message);
        }
    };'''

content = content.replace(old_fetch_balances, new_fetch_balances)

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: Balance engine upgraded for high resilience.")
