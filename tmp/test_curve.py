def test_curve():
    virtual_bnb = 0.5
    token_reserve = 1_000_000_000
    bnb_reserve = 0

    amounts = [0.05, 0.1, 0.15, 0.2]
    
    for amount in amounts:
        fee = amount * 0.05
        remaining = amount - fee
        lpShare = fee * 0.6
        curveShare = fee - lpShare
        
        # AMM formula with virtual BNB
        total_bnb = virtual_bnb + bnb_reserve
        # (total_bnb) * token_reserve = (total_bnb + remaining) * (token_reserve - tokensOut)
        tokens_out = (remaining * token_reserve) / (total_bnb + remaining)
        
        bnb_reserve += (remaining + curveShare)
        token_reserve -= tokens_out
        
        print(f"Buy {amount} BNB -> fee {fee}, rem {remaining}, lpShare {lpShare}, curveShare {curveShare}")
        print(f"TokensOut: {tokens_out}")
        print(f"Reserves: token={token_reserve}, bnb={bnb_reserve}")
        print(f"Price: {(virtual_bnb + bnb_reserve)/token_reserve}")

test_curve()
