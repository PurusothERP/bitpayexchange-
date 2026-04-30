filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# The broken section: after </form>, success/error blocks are outside the card div
# with 3 extra closing divs. We need to put them INSIDE the card div (before its close)
# and remove 2 of the 3 orphan closing divs.

old = (
    '                                    </form>\r\n'
    '\r\n'
    '                                        {swapStatus === \'success\' && (\r\n'
    '                                            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="mt-8 p-6 bg-sky-50 border border-sky-100 rounded-3xl flex items-center gap-4">\r\n'
    '                                                <div className="w-12 h-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20"><Check className="w-6 h-6" /></div>\r\n'
    '                                                <div>\r\n'
    '                                                    <p className="font-black text-sky-600 uppercase text-xs">Transaction Verified</p>\r\n'
    '                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Tokens have been distributed</p>\r\n'
    '                                                </div>\r\n'
    '                                            </motion.div>\r\n'
    '                                        )}\r\n'
    '                                        {error && (\r\n'
    '                                            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-3xl flex items-center gap-4">\r\n'
    '                                                <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20"><X className="w-6 h-6" /></div>\r\n'
    '                                                <div>\r\n'
    '                                                    <p className="font-black text-blue-600 uppercase text-xs">Execution Failed</p>\r\n'
    '                                                    <p className="text-[10px] font-bold text-gray-400 uppercase truncate max-w-[300px]">{error}</p>\r\n'
    '                                                </div>\r\n'
    '                                            </motion.div>\r\n'
    '                                        )}\r\n'
    '                                    </div>\r\n'
    '                                </div>\r\n'
    '                            </div>\r\n'
)

new = (
    '                                    </form>\r\n'
    '\r\n'
    '                                    {swapStatus === \'success\' && (\r\n'
    '                                        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">\r\n'
    '                                            <div className="w-7 h-7 bg-emerald-500 text-white rounded-md flex items-center justify-center shrink-0"><Check className="w-4 h-4" /></div>\r\n'
    '                                            <div>\r\n'
    '                                                <p className="font-black text-emerald-700 uppercase text-[10px] tracking-wide">Transaction Verified</p>\r\n'
    '                                                <p className="text-[10px] text-emerald-600">Tokens have been distributed</p>\r\n'
    '                                            </div>\r\n'
    '                                        </motion.div>\r\n'
    '                                    )}\r\n'
    '                                    {error && (\r\n'
    '                                        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">\r\n'
    '                                            <div className="w-7 h-7 bg-red-500 text-white rounded-md flex items-center justify-center shrink-0"><X className="w-4 h-4" /></div>\r\n'
    '                                            <div>\r\n'
    '                                                <p className="font-black text-red-600 uppercase text-[10px] tracking-wide">Execution Failed</p>\r\n'
    '                                                <p className="text-[10px] text-slate-500 truncate max-w-[300px]">{error}</p>\r\n'
    '                                            </div>\r\n'
    '                                        </motion.div>\r\n'
    '                                    )}\r\n'
    '                                </div>\r\n'
    '                            </div>\r\n'
)

if old in content:
    content = content.replace(old, new, 1)
    with open(filepath, 'w') as f:
        f.write(content)
    print("SUCCESS: JSX nesting fixed.")
else:
    print("FAIL: Pattern not found. Trying LF version...")
    old_lf = old.replace('\r\n', '\n')
    new_lf = new.replace('\r\n', '\n')
    if old_lf in content:
        content = content.replace(old_lf, new_lf, 1)
        with open(filepath, 'w') as f:
            f.write(content)
        print("SUCCESS: Fixed with LF line endings.")
    else:
        print("FAIL: Neither CRLF nor LF pattern found.")
