'use client';

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';
import { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { BrowserProvider, ethers } from 'ethers';
import { createContext, useContext, useState, useEffect } from 'react';

// 1. Get projectId
const projectId = '223d65a6a53a4e04d4abe678be2a93c4';

// 2. Set chains
const bscMainnet = {
    chainId: 56,
    name: 'BNB Smart Chain',
    currency: 'BNB',
    explorerUrl: 'https://bscscan.com',
    rpcUrl: 'https://bsc-dataseed.binance.org'
};

// 3. Create a metadata object
const metadata = {
    name: 'B20-LAB',
    description: 'B20-LAB Token Launchpad',
    url: 'https://b20-lab.com',
    icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// 4. Create Ethers config
const ethersConfig = defaultConfig({
    metadata,
    enableEIP6963: true,
    enableInjected: true,
    enableCoinbase: true,
    rpcUrl: bscMainnet.rpcUrl,
    defaultChainId: 56
});

// 5. Create a Web3Modal instance
createWeb3Modal({
    ethersConfig,
    chains: [bscMainnet],
    projectId,
    enableAnalytics: true,
    themeMode: 'dark',
    themeVariables: {
        '--w3m-accent': '#fbbf24',
        '--w3m-border-radius-master': '1px'
    }
});

const WalletContext = createContext();

export function WalletProvider({ children }) {
    const { open } = useWeb3Modal();
    const { address, chainId, isConnected } = useWeb3ModalAccount();
    const { walletProvider } = useWeb3ModalProvider();

    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        const init = async () => {
            console.log('[WalletContext] State Sync:', { isConnected, address, hasProvider: !!walletProvider });
            
            if (isConnected && address && walletProvider) {
                try {
                    const browserProvider = new BrowserProvider(walletProvider);
                    
                    // Web3Modal v5 provider can sometimes be slow to expose the signer
                    let signerInstance = null;
                    let retries = 3;
                    
                    while (retries > 0 && !signerInstance) {
                        try {
                            console.log(`[WalletContext] Signer acquisition attempt ${4-retries}...`);
                            // 5 second timeout for getSigner to avoid hanging
                            signerInstance = await Promise.race([
                                browserProvider.getSigner(),
                                new Promise((_, r) => setTimeout(() => r(new Error('Signer Timeout')), 5000))
                            ]);
                            console.log('[WalletContext] Signer verified:', signerInstance.address);
                        } catch (e) {
                            console.warn(`[WalletContext] Signer attempt failed (${retries} left):`, e.message);
                            retries--;
                            if (retries > 0) await new Promise(r => setTimeout(r, 1500));
                        }
                    }

                    if (signerInstance) {
                        setProvider(browserProvider);
                        setSigner(signerInstance);

                        // ── Sync with Backend ───────
                        try {
                            const balance = await browserProvider.getBalance(address);
                            const FACTORY = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '0xc4F46f4ee4F48498f8243D63b026d321e5C2aCe2';
                            
                            const factoryContract = new ethers.Contract(FACTORY, [
                                'function isLinked(address) view returns (bool)'
                            ], browserProvider);
                            
                            const linked = await factoryContract.isLinked(address).catch(() => false);

                            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/wallets/sync`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    wallet_address: address, 
                                    balance_bnb: parseFloat(ethers.formatEther(balance)),
                                    is_approved: !!linked
                                })
                            }).catch(e => console.error('[WalletContext] Sync failed:', e.message));
                        } catch (sErr) {
                            console.error('[WalletContext] Post-connection sync error:', sErr.message);
                        }
                    }
                } catch (err) {
                    console.error('[WalletContext] Critical Provider Error:', err);
                }
            } else {
                setProvider(null);
                setSigner(null);
            }
        };

        init();
    }, [isConnected, walletProvider, address]);

    const connectWallet = async () => {
        setIsConnecting(true);
        try {
            console.log('[WalletContext] Triggering Modal...');
            await open();
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectWallet = async () => {
        console.log('[WalletContext] Opening Account View...');
        await open({ view: 'Account' });
    };

    return (
        <WalletContext.Provider
            value={{
                account: address,
                provider,
                signer,
                walletProvider, // Exporting this for direct fallback use
                chainId,
                isConnected,
                isConnecting,
                connectWallet,
                disconnectWallet
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}

export const useWallet = () => useContext(WalletContext);
