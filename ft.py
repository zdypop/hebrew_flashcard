import yfinance as yf
# 单股
data = yf.download("aapl", start="2022-05-18", end="2022-05-23", interval="1m")
print(data)