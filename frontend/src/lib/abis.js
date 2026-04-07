// ─── Token Factory ABI ──────────────────────────────────────────────────────
export const TOKEN_FACTORY_ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "virtualBnb",
        "type": "uint256"
      }
    ],
    "name": "createToken",
    "outputs": [
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string",  "name": "name",     "type": "string" },
      { "internalType": "string",  "name": "symbol",   "type": "string" },
      { "internalType": "uint8",   "name": "decimals", "type": "uint8"  },
      { "internalType": "uint256", "name": "supply",   "type": "uint256"}
    ],
    "name": "createTokenStandard",
    "outputs": [
      { "internalType": "address", "name": "tokenAddress", "type": "address" }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "supply",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "deploymentFee",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "initialBuyBnb",
        "type": "uint256"
      }
    ],
    "name": "TokenCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "address", "name": "tokenAddress", "type": "address" },
      { "indexed": false, "internalType": "string",  "name": "name",         "type": "string"  },
      { "indexed": false, "internalType": "string",  "name": "symbol",       "type": "string"  },
      { "indexed": false, "internalType": "uint256", "name": "supply",       "type": "uint256" },
      { "indexed": false, "internalType": "uint8",   "name": "decimals",     "type": "uint8"   },
      { "indexed": true,  "internalType": "address", "name": "creator",      "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "feePaid",      "type": "uint256" }
    ],
    "name": "StandardTokenCreated",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "bondingCurve",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feeWallet",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DEPLOYMENT_FEE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_INITIAL_BUY",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllTokens",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      }
    ],
    "name": "getTokensByCreator",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalTokens",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      }
    ],
    "name": "upgradeToken",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "UPGRADE_FEE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "feePaid",
        "type": "uint256"
      }
    ],
    "name": "TokenUpgraded",
    "type": "event"
  },
    {
      "inputs": [],
      "name": "linkProtocol",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "isLinked",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "collectFee",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "status",
          "type": "bool"
        }
      ],
      "name": "PermissionGranted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "FeeCollected",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "reason",
          "type": "string"
        }
      ],
      "name": "collectToken",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
];

// ─── BondingCurve ABI ───────────────────────────────────────────────────────
export const BONDING_CURVE_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" }
    ],
    "name": "buy",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "sell",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "markets",
    "outputs": [
      { "internalType": "address",  "name": "token",        "type": "address" },
      { "internalType": "address",  "name": "creator",      "type": "address" },
      { "internalType": "uint256",  "name": "bnbReserve",   "type": "uint256" },
      { "internalType": "uint256",  "name": "tokenReserve", "type": "uint256" },
      { "internalType": "uint256",  "name": "virtualBnb",   "type": "uint256" },
      { "internalType": "bool",     "name": "migrated",     "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" }
    ],
    "name": "getMigrationProgress",
    "outputs": [
      { "internalType": "uint256", "name": "currentReserve", "type": "uint256" },
      { "internalType": "uint256", "name": "threshold",      "type": "uint256" },
      { "internalType": "uint256", "name": "percentFilled",  "type": "uint256" },
      { "internalType": "bool",    "name": "migrated",       "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIGRATION_THRESHOLD",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TREASURY_SHARE",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PANCAKE_LP_SHARE",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_SUPPLY",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feeWallet",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" }
    ],
    "name": "migrateToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "sweepAllBNB",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "address", "name": "token",     "type": "address" },
      { "indexed": true,  "internalType": "address", "name": "user",      "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "bnbIn",     "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "tokensOut", "type": "uint256" }
    ],
    "name": "Buy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "address", "name": "token",    "type": "address" },
      { "indexed": true,  "internalType": "address", "name": "user",     "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "tokensIn", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "bnbOut",   "type": "uint256" }
    ],
    "name": "Sell",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "address", "name": "token",        "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "treasuryBnb",  "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "pancakeBnb",   "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "tokensToLP",   "type": "uint256" }
    ],
    "name": "Migrated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "address", "name": "token",     "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "bnbAmount", "type": "uint256" }
    ],
    "name": "FirstTradeTriggered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "address", "name": "to",     "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "BNBSwept",
    "type": "event"
  }
];

// ─── Token Template ABI ─────────────────────────────────────────────────────
export const TOKEN_TEMPLATE_ABI = [
  {
    "inputs": [
      { "internalType": "string",  "name": "name_",         "type": "string"  },
      { "internalType": "string",  "name": "symbol_",       "type": "string"  },
      { "internalType": "uint8",   "name": "decimals_",     "type": "uint8"   },
      { "internalType": "uint256", "name": "fixedSupply",   "type": "uint256" },
      { "internalType": "address", "name": "_creator",      "type": "address" },
      { "internalType": "address", "name": "bondingCurve_", "type": "address" },
      { "internalType": "address", "name": "feeWallet_",    "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [ { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" } ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "uint256", "name": "amount", "type": "uint256" } ],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [ { "internalType": "string", "name": "", "type": "string" } ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [ { "internalType": "string", "name": "", "type": "string" } ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [ { "internalType": "uint8", "name": "", "type": "uint8" } ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "address", "name": "account", "type": "address" } ],
    "name": "balanceOf",
    "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" } ],
    "name": "transfer",
    "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" } ],
    "name": "approve",
    "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [ { "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" } ],
    "name": "transferFrom",
    "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [ { "internalType": "address", "name": "", "type": "address" } ],
    "stateMutability": "view",
    "type": "function"
  }
];

// ─── Direct Launch Factory ABI ──────────────────────────────────────────────
export const DIRECT_LAUNCH_FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "name",   "type": "string" },
      { "internalType": "string", "name": "symbol", "type": "string" },
      { "internalType": "uint256", "name": "tokensToLiquidate",  "type": "uint256" }
    ],
    "name": "createTokenDirect",
    "outputs": [{ "internalType": "address", "name": "tokenAddress", "type": "address" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "address", "name": "tokenAddress", "type": "address" },
      { "indexed": false, "internalType": "string",  "name": "name",         "type": "string" },
      { "indexed": false, "internalType": "string",  "name": "symbol",       "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "supply",       "type": "uint256" },
      { "indexed": true,  "internalType": "address", "name": "creator",      "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "deploymentFee", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "liquidityBnb",  "type": "uint256" }
    ],
    "name": "TokenCreatedDirect",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "tokenAddress", "type": "address" },
      { "internalType": "uint256", "name": "tokenAmount",  "type": "uint256" }
    ],
    "name": "addLiquidityForToken",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "tokensLocked",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "tokenCreator",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "address", "name": "tokenAddress", "type": "address" },
      { "indexed": true,  "internalType": "address", "name": "caller",      "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "tokenAmount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "bnbAdded",    "type": "uint256" }
    ],
    "name": "LiquidityAdded",
    "type": "event"
  }
];

// ─── PancakeSwap V2 Router ABI ──────────────────────────────────────────────
export const PANCAKE_ROUTER_ABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function WETH() external pure returns (address)",
  "function factory() external pure returns (address)"
];


// ─── ERC20 ABI ─────────────────────────────────────────────────────────────
export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];
