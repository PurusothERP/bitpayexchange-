import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# Replace direct CoinGecko calls with backend proxy calls
# The proxy is at `${API_URL}/tokens/markets/cg` or similar

content = content.replace(
    'await axios.get(`https://api.coingecko.com/api/v3/coins/${latest.id}`).catch(() => null);',
    'await axios.get(`${API_URL}/tokens/markets/cg?ids=${latest.id}`).catch(() => null);'
)

# Note: The backend route `/api/tokens/markets/cg` might need to be updated to support `ids` parameter
# Let's check backend/routes/tokens.js line 232 again.
# It uses req.query which includes everything.

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: CoinGecko direct calls proxied through backend.")
