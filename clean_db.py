import sqlite3

def clean_db():
    conn = sqlite3.connect('database.sqlite')
    c = conn.cursor()
    
    # 1. Fetch all tokens
    c.execute("SELECT id, name, symbol, contract_address, is_meme, created_at FROM tokens ORDER BY created_at DESC, id DESC")
    tokens = c.fetchall()
    
    print(f"Total tokens in DB: {len(tokens)}")
    
    # Identify mocks (e.g. name contains "mock", "test", or symbol contains "test")
    mocks_to_delete = []
    seen_symbols = set()
    duplicates_to_delete = []
    
    for t in tokens:
        t_id, name, symbol, address, is_meme, created_at = t
        
        name_lower = name.lower() if name else ""
        symbol_lower = symbol.lower() if symbol else ""
        
        if "mock" in name_lower or "test" in name_lower or "mock" in symbol_lower or "test" in symbol_lower:
            mocks_to_delete.append((t_id, name, symbol))
            continue
            
        if symbol_lower in seen_symbols:
            duplicates_to_delete.append((t_id, name, symbol))
        else:
            seen_symbols.add(symbol_lower)
            
    print(f"Mocks found: {len(mocks_to_delete)}")
    for m in mocks_to_delete:
        print(f"  - {m[1]} ({m[2]}) ID: {m[0]}")
        
    print(f"Duplicates found: {len(duplicates_to_delete)}")
    for d in duplicates_to_delete[:10]:
        print(f"  - {d[1]} ({d[2]}) ID: {d[0]}")
    if len(duplicates_to_delete) > 10:
        print(f"  ... and {len(duplicates_to_delete)-10} more")
        
    # Execute deletions
    all_to_delete = [t[0] for t in mocks_to_delete] + [t[0] for t in duplicates_to_delete]
    if all_to_delete:
        placeholders = ','.join('?' for _ in all_to_delete)
        c.execute(f"DELETE FROM tokens WHERE id IN ({placeholders})", all_to_delete)
        conn.commit()
        print(f"Deleted {len(all_to_delete)} tokens from DB.")
    else:
        print("No tokens to delete.")
        
    conn.close()

if __name__ == '__main__':
    clean_db()
