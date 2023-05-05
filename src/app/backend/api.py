from flask import Flask
import data

app = Flask(__name__)


@app.route("/info/<ticker>")
def get_ticker_info(ticker):
    df = data.create_df(ticker)
    if not df is None and len(df) > 120:
        df = data.preprocess_df(df)[
            data.SEQUENCE_LEN + data.PREDICTION_PERIOD_OFFSET - 1 :
        ]
        startDate = df.index[0]
        endDate = df.index[-1]
        return {
            "ticker": ticker,
            "exists": True,
            "minDate": startDate,
            "maxDate": endDate,
        }
    return {"ticker": ticker, "exists": False}
