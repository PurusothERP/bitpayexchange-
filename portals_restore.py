import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# Missing Portal rendering blocks
portals_blocks = """
                    {mode === 'bonding' && (
                        <motion.div key="bonding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto">
                            <BondingPortal tokens={tokens.filter(t => t.isB20)} setMode={setMode} setToToken={setToToken} />
                        </motion.div>
                    )}

                    {mode === 'web3' && (
                        <motion.div key="web3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto">
                            <Web3Portal tokens={tokens.filter(t => !t.isB20)} setMode={setMode} setToToken={setToToken} />
                        </motion.div>
                    )}

                    {mode === 'list' && (
                        <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto">
                            <ListingPortal />
                        </motion.div>
                    )}

                    {mode === 'community' && (
                        <motion.div key="community" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto">
                            <CommunityPortal />
                        </motion.div>
                    )}

                    {mode === 'announcements' && (
                        <motion.div key="announcements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto">
                            <AnnouncementsPortal />
                        </motion.div>
                    )}

                    {mode === 'smart-money' && (
                        <motion.div key="smart-money" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto">
                            <SmartMoneyPortal />
                        </motion.div>
                    )}
"""

if "{mode === 'bonding' && (" not in content:
    # Insert before the closing </AnimatePresence>
    content = content.replace('</AnimatePresence>', portals_blocks + '\n                </AnimatePresence>')

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: All missing portals restored to the mode navigator.")
