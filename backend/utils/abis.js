// Backend ABIs — kept in sync with the deployed contracts

const TOKEN_FACTORY_ABI = [
    // createToken(name, symbol) — payable, supply fixed to 1B on-chain
    "event TokenCreated(address indexed tokenAddress, string name, string symbol, uint256 supply, address indexed creator, uint256 deploymentFee, uint256 initialBuyBnb)",
    "function createToken(string name, string symbol) external payable returns (address)",
    "function getAllTokens() external view returns (address[])",
    "function getTokensByCreator(address creator) external view returns (address[])",
    "function totalTokens() external view returns (uint256)",
    "function creatorOf(address tokenAddress) external view returns (address)",
    "function DEPLOYMENT_FEE() external view returns (uint256)",
    "function MIN_INITIAL_BUY() external view returns (uint256)",
    "function bondingCurve() external view returns (address)",
    "function feeWallet() external view returns (address)"
];

const TOKEN_TEMPLATE_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function creator() view returns (address)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)"
];

const BONDING_CURVE_ABI = [
    "event TokenLaunched(address indexed token, address indexed creator)",
    "event Buy(address indexed token, address indexed user, uint256 bnbIn, uint256 tokensOut)",
    "event Sell(address indexed token, address indexed user, uint256 tokensIn, uint256 bnbOut)",
    "event Migrated(address indexed token, uint256 bnbToLP, uint256 tokensToLP, uint256 bnbToFee)",
    "function buy(address token) external payable",
    "function sell(address token, uint256 amount) external",
    "function markets(address) view returns (address token, address creator, uint256 collateral, uint256 supply, bool migrated)",
    "function authorizedFactories(address) view returns (bool)",
    "function feeWallet() view returns (address)",
    "function INITIAL_PRICE() view returns (uint256)",
    "function MIGRATION_THRESHOLD() view returns (uint256)",
    "function MAX_SUPPLY() view returns (uint256)"
];

const LIQUIDITY_MANAGER_ABI = [
    "function addLiquidity(address token, uint256 tokenAmount, address lpReceiver) external payable returns (uint256 liquidity)",
    "event LiquidityAdded(address indexed token, uint256 tokenAmount, uint256 ethAmount, address lpReceiver)"
];

module.exports = {
    TOKEN_FACTORY_ABI,
    TOKEN_TEMPLATE_ABI,
    BONDING_CURVE_ABI,
    LIQUIDITY_MANAGER_ABI
};
