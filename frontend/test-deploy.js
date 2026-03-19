const { ethers } = require('ethers');

async function test() {
  const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("No private key");
  const wallet = new ethers.Wallet(privateKey, provider);
  const factoryAddress = "0xc4F46f4ee4F48498f8243D63b026d321e5C2aCe2";
  const factoryAbi = [
      "function createToken(string name, string symbol) external payable returns (address)"
  ];
  const factory = new ethers.Contract(factoryAddress, factoryAbi, wallet);

  console.log("Wallet:", wallet.address);
  console.log("Balance:", ethers.formatEther(await provider.getBalance(wallet.address)));
  
  try {
      console.log("Estimating gas...");
      const gas = await factory.createToken.estimateGas("Test Token", "TST", { value: 0 });
      console.log("Estimated Gas:", gas.toString());
  } catch (e) {
      console.error("Gas estimation failed:", e.message);
  }
}

test().catch(console.error);
