import os

filepath = 'frontend/src/app/exchange/page.js'

with open(filepath, 'r') as f:
    content = f.read()

# 1. Update AnnouncementsPortal Styling
old_ann_bg = '<div className="bg-white/50 backdrop-blur-3xl border border-gray-100 rounded-[3rem] p-8 md:p-12 shadow-3xl shadow-indigo-900/5 min-h-[500px]">'
new_ann_bg = '<div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-12 shadow-sm min-h-[500px]">'

old_ann_header = '''            <div className="flex items-center gap-6 mb-12 border-b border-gray-100 pb-8">
                <div className="w-16 h-16 bg-purple-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/20">
                    <Megaphone className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Official B20 Bulletin</h2>
                    <p className="text-xs font-black text-purple-500 uppercase tracking-[0.3em] mt-1">24H Live System Broadcasts</p>
                </div>
            </div>'''

new_ann_header = '''            <div className="flex items-center gap-6 mb-10 border-b border-slate-100 pb-8">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shadow-sm">
                    <Megaphone className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Institutional Bulletin</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Global System Broadcasts</p>
                </div>
            </div>'''

content = content.replace(old_ann_bg, new_ann_bg)
content = content.replace(old_ann_header, new_ann_header)

# 2. Update CommunityPortal Styling
old_com_bg = '<div className="bg-white/50 backdrop-blur-3xl border border-gray-100 rounded-[3rem] p-8 md:p-12 shadow-3xl shadow-indigo-900/5 min-h-[500px]">'
new_com_bg = '<div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-12 shadow-sm min-h-[500px]">'

old_com_header = '''            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-gray-100 pb-8">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20">
                        <MessageSquare className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">B20 Community Nexus</h2>
                        <p className="text-xs font-black text-blue-500 uppercase tracking-[0.3em] mt-1">Live Institutional Sentiment</p>
                    </div>
                </div>
            </div>'''

new_com_header = '''            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-slate-100 pb-8">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shadow-sm">
                        <MessageSquare className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Community Nexus</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Global Intelligence Feed</p>
                    </div>
                </div>
            </div>'''

content = content.replace(old_com_bg, new_com_bg)
content = content.replace(old_com_header, new_com_header)

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS: Portal designs updated to institutional style.")
