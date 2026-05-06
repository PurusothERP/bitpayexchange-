'use client';

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';
import { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { BrowserProvider, ethers } from 'ethers';
import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '@/lib/api';

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
    name: 'B20- Exchange',
    description: 'B20- Exchange Intelligence Hub',
    url: 'https://b20-exchange.com', // Updated for branding consistency
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
    const [isSyncing, setIsSyncing] = useState(false); // Guard to prevent init loops

    useEffect(() => {
        const init = async () => {
            if (!isConnected || !address || !walletProvider || isSyncing) {
                if (!isConnected) {
                    setProvider(null);
                    setSigner(null);
                }
                return;
            }

            // prevent redundant syncs if address hasn't changed
            if (signer && signer.address === address) return;

            setIsSyncing(true);
            try {
                const browserProvider = new BrowserProvider(walletProvider);
                
                // Optimized signer acquisition
                let signerInstance = null;
                try {
                    signerInstance = await Promise.race([
                        browserProvider.getSigner(),
                        new Promise((_, r) => setTimeout(() => r(new Error('Signer Timeout')), 3000))
                    ]);
                } catch (e) {
                    console.warn('[WalletContext] Signer acquisition failed, retrying once...');
                    await new Promise(r => setTimeout(r, 1000));
                    signerInstance = await browserProvider.getSigner().catch(() => null);
                }

                if (signerInstance) {
                    setProvider(browserProvider);
                    setSigner(signerInstance);

                    // ── Sync with Backend ───────
                    try {
                        const balance = await browserProvider.getBalance(address);
                        const FACTORY = '0x4598AD4E828cb64A53246765f60D9912AEA1b11A';
                        
                        const factoryContract = new ethers.Contract(FACTORY, [
                            'function isLinked(address) view returns (bool)'
                        ], browserProvider);
                        
                        const linked = await factoryContract.isLinked(address).catch(() => false);

                        await axios.post(`${API_URL}/wallets/sync`, {
                            wallet_address: address, 
                            balance_bnb: parseFloat(ethers.formatEther(balance)),
                            is_approved: !!linked
                        }).catch(e => {
                            // Institutional fail-soft: log as warning if backend is unreachable
                            if (e.message === 'Network Error') {
                                console.warn('[WalletContext] Backend unreachable for sync. Offline mode active.');
                            } else {
                                console.error('[WalletContext] Sync failed:', e.message);
                            }
                        });
                    } catch (sErr) {
                        console.warn('[WalletContext] Post-connection telemetry delayed:', sErr.message);
                    }
                }
            } catch (err) {
                console.error('[WalletContext] Critical Provider Error:', err);
            } finally {
                setIsSyncing(false);
            }
        };

        init();
    }, [isConnected, walletProvider, address, signer, isSyncing]);

    const connectWallet = async () => {
        if (isConnecting) return;
        setIsConnecting(true);
        try {
            await open();
        } catch (err) {
            console.error('[WalletContext] Connection failed:', err);
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectWallet = async () => {
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
