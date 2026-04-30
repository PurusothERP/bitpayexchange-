'use client';

import { useWallet } from '@/context/WalletContext';
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const BSC_CHAIN_ID = 56; // BSC Mainnet only

const BSC_PARAMS = {
    chainId: '0x38', // 56 in hex
    chainName: 'BNB Smart Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://rpc.ankr.com/bsc'],
    blockExplorerUrls: ['https://bscscan.com'],
};

export default function NetworkGuard({ children }) {
    const { chainId, isConnected } = useWallet();
    const [switching, setSwitching] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    const isWrongNetwork =
        isConnected &&
        chainId &&
        chainId !== BSC_CHAIN_ID;

    const switchToBSC = async () => {
        if (!window.ethereum) return;
        setSwitching(true);
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BSC_PARAMS.chainId }],
            });
            setDismissed(false);
        } catch (switchError) {
            // Chain not added — add it
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [BSC_PARAMS],
                    });
                } catch {
                    // user rejected
                }
            }
        }
        setSwitching(false);
    };

    if (!isWrongNetwork || dismissed) return children;

    return (
        <>
            {/* Sticky warning banner */}
            <div className="fixed top-0 left-0 right-0 z-[200] bg-indigo-500 text-white py-2.5 px-4 flex items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-2 text-sm font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                        Wrong network detected! B20- Exchange runs on <strong>BNB Smart Chain</strong>. You are on chain ID {chainId}.
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={switchToBSC}
                        disabled={switching}
                        className="px-4 py-1.5 bg-white text-indigo-700 text-xs font-black rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-60"
                    >
                        {switching ? 'Switching...' : '⚡ Switch to BSC'}
                    </button>
                    <button
                        onClick={() => setDismissed(true)}
                        className="text-white/70 hover:text-white text-lg leading-none px-1"
                    >
                        ×
                    </button>
                </div>
            </div>
            {/* Push content down when banner is present */}
            <div className="pt-10">{children}</div>
        </>
    );
}
