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

const ethereumMainnet = {
    chainId: 1,
    name: 'Ethereum',
    currency: 'ETH',
    explorerUrl: 'https://etherscan.io',
    rpcUrl: 'https://cloudflare-eth.com'
};

const polygonMainnet = {
    chainId: 137,
    name: 'Polygon',
    currency: 'MATIC',
    explorerUrl: 'https://polygonscan.com',
    rpcUrl: 'https://polygon-rpc.com'
};

const baseMainnet = {
    chainId: 8453,
    name: 'Base',
    currency: 'ETH',
    explorerUrl: 'https://basescan.org',
    rpcUrl: 'https://mainnet.base.org'
};

const arbitrumMainnet = {
    chainId: 42161,
    name: 'Arbitrum',
    currency: 'ETH',
    explorerUrl: 'https://arbiscan.io',
    rpcUrl: 'https://arb1.arbitrum.io/rpc'
};

// 3. Create a metadata object
const metadata = {
    name: 'Tez Exchange Intelligence',
    description: 'Tez Exchange Institutional Trading & Yield Hub',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://tezexchange.io',
    icons: ['https://b20-frontend.onrender.com/logo.png']
};

// 4. Create Ethers config
const ethersConfig = defaultConfig({
    metadata,
    enableEIP6963: true,
    enableInjected: true,
    enableCoinbase: true,
    rpcUrl: bscMainnet.rpcUrl,
    defaultChainId: 56,
    enableEmail: false,
    enableSmartAccounts: false
});

// 5. Create a Web3Modal instance
createWeb3Modal({
    ethersConfig,
    chains: [bscMainnet, ethereumMainnet, polygonMainnet, baseMainnet, arbitrumMainnet],
    projectId,
    enableAnalytics: true,
    themeMode: 'dark',
    allWallets: 'SHOW',
    featuredWalletIds: [
        '971e689d049048a4e13c9a056bb6d0c4', // MetaMask
        '4622a2b2d6ad141014e58901b8e0d402', // Binance Wallet
        'c5332d3020e2c89e4127138980753f8a'  // Trust Wallet
    ],
    themeVariables: {
        '--w3m-accent': '#009393', // Teal accent
        '--w3m-border-radius-master': '12px',
        '--w3m-font-family': 'Inter, sans-serif'
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
        if (typeof window !== 'undefined') {
            const originalError = window.console.error;
            window.console.error = function (...args) {
                const errorStr = args.map(arg => {
                    if (!arg) return '';
                    if (typeof arg === 'object') {
                        try {
                            return JSON.stringify(arg);
                        } catch (e) {
                            return String(arg);
                        }
                    }
                    return String(arg);
                }).join(' ');

                if (
                    errorStr.includes('Request expired') ||
                    errorStr.includes('user rejected') ||
                    errorStr.includes('ACTION_REJECTED') ||
                    errorStr.includes('network changed') ||
                    errorStr.includes('NETWORK_ERROR') ||
                    errorStr.includes('invalid parent provider') ||
                    errorStr.includes('Provider Timeout') ||
                    errorStr.includes('Signer Timeout') ||
                    errorStr.includes('User rejected the transaction') ||
                    errorStr.includes('Modal closed') ||
                    errorStr.includes('Connection failed') ||
                    errorStr.includes('Sync failed') ||
                    errorStr.includes('Wallet provider not found')
                ) {
                    console.warn('[Suppressed Next.js Error Overlay]:', ...args);
                    return;
                }
                originalError.apply(window.console, args);
            };
        }
    }, []);

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
                        const FACTORY = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
                        
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
                disconnectWallet,
                switchNetwork: () => open({ view: 'Networks' })
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}

export const useWallet = () => useContext(WalletContext);
