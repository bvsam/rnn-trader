import yfinance as yf
import numpy as np
from sklearn import preprocessing
from ta.momentum import RSIIndicator
from collections import deque
import tensorflow as tf
import datetime
import pandas as pd


class RNNPredictor:
    # Length of sequences to feed the RNN
    SEQUENCE_LEN = 60
    # Number of periods (days if data is daily) in the future to predict
    PREDICTION_PERIOD_OFFSET = 20

    RELEVANT_COLS = ["Close"]
    INDICATOR_TICKERS = ["QQQ", "^TNX", "^VIX", "CL=F"]

    def __init__(self, ticker: str, model) -> None:
        self.TICKER = ticker
        self.MODEL = model
        self.CLOSE_COL = f"{self.TICKER}_Close"
        self.CLOSE_FUTURE_COL = f"{self.CLOSE_COL}_Future"
        self.TARGET_COL = "Target"
        self.CLOSE_CHANGE_COL = f"{self.CLOSE_COL}_Change"
        self.IMPLIED_CLOSE_CHANGE_COL = f"{self.CLOSE_CHANGE_COL}_Implied"
        self.PREDICTION_COL = "Prediction"
        self.update()

    def update(self) -> None:
        self.history = self.create_history()
        self.df = self.create_df()
        self.results = self.create_results()

    def predict(
        self,
        start_date: datetime.datetime,
        end_date: datetime.datetime,
        date_fmt: str = "%Y-%m-%d",
    ) -> list:
        if start_date < self.min_date or end_date > self.max_date:
            raise ValueError(
                "predict() was called with invalid values for start_date and/or end_date."
            )

        col_name_map = {
            self.TARGET_COL: "target",
            self.PREDICTION_COL: "prediction",
            self.CLOSE_CHANGE_COL: "change",
            self.IMPLIED_CLOSE_CHANGE_COL: "implied",
        }
        date_col = "date"

        results = self.results.copy()
        results.index = pd.to_datetime(results.index, utc=True)
        results = results.loc[
            (results.index >= start_date) & (results.index <= end_date)
        ]

        results = results[col_name_map.keys()]
        results[self.TARGET_COL] = results[self.TARGET_COL] == 1
        results[self.PREDICTION_COL] = results[self.PREDICTION_COL] == 1
        results[date_col] = results.index
        results[date_col] = pd.to_datetime(results[date_col]).apply(
            lambda x: x.date().strftime(date_fmt)
        )

        # Rename the columns to be more concise
        results: pd.DataFrame = results.rename(columns=col_name_map)

        return results.to_dict("records")

    def create_results(self) -> pd.DataFrame:
        results = self.history.copy()
        X, y = self.preprocess_df(self.df)

        # Join the y array onto the end of the results dataframe
        filler = np.full(len(results) - len(y), 12)
        results[self.TARGET_COL] = pd.Series(np.append(filler, y), index=results.index)

        logits = self.MODEL(X, training=False)
        predictions = tf.math.argmax(logits, axis=1, output_type=tf.int64)
        # Join the predictions array onto the end of the results dataframe
        filler = np.full(len(results) - len(predictions), np.nan)
        results[self.PREDICTION_COL] = pd.Series(
            np.append(filler, predictions), index=results.index
        )

        results[self.CLOSE_CHANGE_COL] = results[self.CLOSE_COL].pct_change()
        results.dropna(inplace=True)

        results[self.IMPLIED_CLOSE_CHANGE_COL] = np.where(
            results[self.TARGET_COL] != results["Prediction"],
            results[self.CLOSE_CHANGE_COL] * -1,
            results[self.CLOSE_CHANGE_COL],
        )

        return results

    def valid_dates(self) -> tuple[datetime.datetime, datetime.datetime]:
        return self.results.index[0], self.results.index[-1]

    def result_accuracy(self, result: list) -> float:
        total = 0
        correct = 0
        for datapoint in result:
            total += 1
            if datapoint[self.TARGET_COL] == datapoint[self.PREDICTION_COL]:
                correct += 1

        return correct / total

    def create_history(self) -> pd.DataFrame:
        df = yf.download(self.TICKER, progress=False)
        df.drop(columns=["Adj Close"], inplace=True)
        df.rename(
            columns={col: f"{self.TICKER}_{col}" for col in df.columns}, inplace=True
        )

        df[f"{self.CLOSE_COL}_RSI"] = RSIIndicator(df[self.CLOSE_COL], window=14).rsi()
        df.dropna(inplace=True)

        for ticker in self.INDICATOR_TICKERS:
            ticker_data = yf.download(ticker, progress=False)
            relevant_data = ticker_data[self.RELEVANT_COLS]
            relevant_data = relevant_data.rename(
                columns={col: f"{ticker}_{col}" for col in self.RELEVANT_COLS}
            )
            # Only join if the columns aren't already present
            if len(set(df.columns).intersection(set(relevant_data.columns))) == 0:
                df = df.join(relevant_data)

        df.dropna(inplace=True)

        return df

    def create_df(self) -> pd.DataFrame:
        df = self.history.copy()
        self.max_date = (
            df.index[-1].to_pydatetime().replace(tzinfo=datetime.timezone.utc)
        )

        df[self.CLOSE_FUTURE_COL] = df[self.CLOSE_COL].shift(
            -1 * self.PREDICTION_PERIOD_OFFSET
        )
        df.dropna(inplace=True)
        # Target contains integer representations of whether the future price is higher than
        # the current price
        df[self.TARGET_COL] = list(
            map(
                self.classify,
                df[self.CLOSE_COL],
                df[self.CLOSE_FUTURE_COL],
            )
        )

        self.min_date = (
            df.index[self.PREDICTION_PERIOD_OFFSET]
            .to_pydatetime()
            .replace(tzinfo=datetime.timezone.utc)
        )

        return df

    def preprocess_df(self, df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        df = df.drop(columns=[self.CLOSE_FUTURE_COL])

        # Scale the data
        df[[col for col in df.columns if col != self.TARGET_COL]] = df[
            [col for col in df.columns if col != self.TARGET_COL]
        ].pct_change()
        df.replace([np.inf, -np.inf], np.nan, inplace=True)
        df.dropna(inplace=True)
        df[[col for col in df.columns if col != self.TARGET_COL]] = preprocessing.scale(
            df[[col for col in df.columns if col != self.TARGET_COL]].values
        )

        # Create the sequential data
        sequential_data = []
        data_queue = deque(maxlen=self.SEQUENCE_LEN)

        for datapoint in df.values:
            # The last column in the df will be Target. Don't include this in the list of independent features
            data_queue.append(datapoint[:-1])
            if len(data_queue) == self.SEQUENCE_LEN:
                sequential_data.append([np.array(data_queue), datapoint[-1]])

        X = []
        y = []

        for seq, target in sequential_data:
            X.append(seq)
            y.append(target)

        return np.array(X), np.array(y)

    @staticmethod
    def classify(current: float | int, future: float | int) -> int:
        return int(future > current)
