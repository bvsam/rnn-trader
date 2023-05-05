import yfinance as yf
import numpy as np
from sklearn import preprocessing
from ta.momentum import RSIIndicator
from collections import deque
import random
import tensorflow as tf

# Length of sequences to feed the RNN
SEQUENCE_LEN = 60
# Number of periods (days if data is daily) in the future to predict
PREDICTION_PERIOD_OFFSET = 20

RELEVANT_COLS = ["Close"]
INDICATOR_TICKERS = ["QQQ", "^TNX", "^VIX", "CL=F"]


def classify(current, future):
    return int(float(future) > float(current))


def preprocess_df(dft):
    df = dft
    TICKER = df.columns[0].split("_")[0]
    CLOSE_NAME = TICKER + "_Close"
    df = df.drop(columns=[f"{CLOSE_NAME}_Future"])

    # Scale the data
    for col in df.columns:
        if col != "Target":
            df[col] = df[col].pct_change()
            df.replace([np.inf, -np.inf], np.nan, inplace=True)
            df.dropna(inplace=True)
            df[col] = preprocessing.scale(df[col].values)

    df.dropna(inplace=True)

    return df


def create_sequences(df):
    # Create the sequential data
    sequential_data = []
    data_queue = deque(maxlen=SEQUENCE_LEN)

    for datapoint in df.values:
        # The last column in the df will be Target. Don't include this in the list of independent features
        data_queue.append(datapoint[:-1])
        if len(data_queue) == SEQUENCE_LEN:
            sequential_data.append([np.array(data_queue), datapoint[-1]])

    random.shuffle(sequential_data)

    X = []
    y = []

    for seq, target in sequential_data:
        X.append(seq)
        y.append(target)

    return np.array(X), np.array(y)


def create_df(TICKER):
    df = yf.download(TICKER, progress=False)

    if len(df) <= 120:
        return None

    df.drop(columns=["Adj Close"], inplace=True)
    df.rename(columns={col: f"{TICKER}_{col}" for col in df.columns}, inplace=True)

    df[f"{TICKER}_Close_RSI"] = RSIIndicator(df[f"{TICKER}_Close"], window=14).rsi()
    df.dropna(inplace=True)

    for ticker in INDICATOR_TICKERS:
        ticker_data = yf.download(ticker, progress=False)
        relevant_data = ticker_data[RELEVANT_COLS]
        relevant_data = relevant_data.rename(
            columns={col: f"{ticker}_{col}" for col in RELEVANT_COLS}
        )
        # Only join if the columns aren't already present
        if len(set(df.columns).intersection(set(relevant_data.columns))) == 0:
            df = df.join(relevant_data)

    df.dropna(inplace=True)

    df[f"{TICKER}_Close_Future"] = df[f"{TICKER}_Close"].shift(
        -1 * PREDICTION_PERIOD_OFFSET
    )
    df.dropna(inplace=True)
    df["Target"] = list(
        map(classify, df[f"{TICKER}_Close"], df[f"{TICKER}_Close_Future"])
    )

    return df


def test_ticker(model, TICKER):
    df = create_df(TICKER)

    X, y = preprocess_df(df, balance=False)
    print(X)
    print(X.shape)
    print(y)
    print(y[:20])
    print(y.shape)

    logits = model(X, training=False)
    predictions = tf.math.argmax(logits, axis=1, output_type=tf.int64)
    test_accuracy = tf.keras.metrics.Accuracy()

    return test_accuracy(predictions, y)
