import datetime as dt
import os
import pathlib

import requests
import tensorflow as tf
import yfinance as yf
from data import RNNPredictor
from flask import Flask, request

app = Flask(__name__)

model_path = os.path.join(pathlib.Path(__file__).parents[2], "model/models/SPY")
model = tf.keras.models.load_model(model_path)
predictors = {}
invalid = set()


def validate_ticker(ticker):
    if ticker in predictors:
        return True

    if ticker in invalid:
        return False

    required_keys = {
        "regularMarketPreviousClose",
        "previousClose",
        "symbol",
        "underlyingSymbol",
    }
    try:
        info = yf.Ticker(ticker).info
    except requests.exceptions.HTTPError:
        return False

    valid = required_keys.issubset(info.keys())
    if valid:
        predictor = RNNPredictor(ticker, model, 60, 20)
        predictors[ticker] = predictor
    else:
        invalid.add(ticker)

    return valid


@app.route("/info/<ticker>")
def get_ticker_info(ticker):
    if not validate_ticker(ticker):
        return {"ticker": ticker, "exists": False}, 400
    predictor = predictors[ticker]

    return {
        "ticker": ticker,
        "exists": True,
        "minDate": predictor.min_date,
        "maxDate": predictor.max_date,
    }


@app.route("/performance/<ticker>")
def get_performance(ticker):
    start_date = request.args.get("startDate")
    end_date = request.args.get("endDate")

    if start_date is None or end_date is None or not validate_ticker(ticker):
        return {"success": False, "ticker": ticker}, 400

    try:
        start_date = dt.datetime.fromtimestamp(int(start_date), tz=dt.timezone.utc)
        end_date = dt.datetime.fromtimestamp(int(end_date), tz=dt.timezone.utc)
    except (ValueError, OSError):
        return {"success": False, "ticker": ticker}, 400

    predictor: RNNPredictor = predictors[ticker]

    if start_date < predictor.min_date or end_date > predictor.max_date:
        return {"success": False, "ticker": ticker}, 400

    result = predictor.predict(start_date, end_date)

    return {"success": True, "ticker": ticker, "result": result}


if __name__ == "__main__":
    app.run()
