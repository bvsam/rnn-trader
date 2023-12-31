import "./App.css";
import {
  Button,
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  Spinner,
} from "@fluentui/react-components";
import TickerInput, { validationStateTypes } from "./components/TickerInput";
import DateInput from "./components/DateInput";
import { useState } from "react";
import { addDays } from "@fluentui/react-datepicker-compat";
import { getTickerInfo, getPerformance } from "./utils/api";
import { toBrowserTime, toServerTime } from "./utils/datetime";
import { performanceDataType } from "./utils/data";
import PerformanceChart from "./components/PerformanceChart";
import { reduceArray, round, colouredReturnValue } from "./utils/data";

type validationInfoType = {
  ticker: string;
  validationState: validationStateTypes;
};
type dateRangeType = {
  startDate: Date;
  endDate: Date;
};
type dateInfoType = dateRangeType & {
  minDate: Date;
  maxDate: Date;
};

function App() {
  // Date input state
  const startDate = new Date(new Date().setHours(0, 0, 0, 0));
  const [dateInfo, setDateInfo] = useState<dateInfoType>({
    startDate: startDate,
    endDate: addDays(startDate, 1),
    minDate: addDays(startDate, -1),
    maxDate: addDays(startDate, 2),
  });
  // Ticker input state
  const [ticker, setTicker] = useState("");
  const [validationInfo, setValidationInfo] = useState<validationInfoType>({
    ticker: "",
    validationState: "none",
  });
  // Performance data state
  const [chosenTicker, setChosenTicker] = useState(ticker);
  const [performanceData, setPerformanceData] = useState<
    performanceDataType[] | undefined
  >(undefined);
  const [perfDates, setPerfDates] = useState<dateRangeType | undefined>(
    undefined
  );
  // Page state
  const [darkMode, setDarkMode] = useState(false);
  const [spinnerActive, setSpinnerActive] = useState(false);

  // Functions and constants
  const determineValidationState = async (newTicker: string) => {
    switch (newTicker) {
      case "":
        setValidationInfo({ ticker: newTicker, validationState: "none" });
        break;
      default: {
        setSpinnerActive(true);
        const response = await getTickerInfo(newTicker);
        setSpinnerActive(false);
        if (response.ticker === newTicker && response.exists) {
          setValidationInfo({ ticker: newTicker, validationState: "success" });
          const newMinDate = toBrowserTime(response.minDate);
          const newMaxDate = toBrowserTime(response.maxDate);
          setDateInfo({
            startDate: newMinDate,
            endDate: newMaxDate,
            minDate: newMinDate,
            maxDate: newMaxDate,
          });
        } else {
          setValidationInfo({ ticker: newTicker, validationState: "error" });
        }
        break;
      }
    }
  };
  const roundingDigits = 2;

  return (
    <FluentProvider theme={darkMode ? webDarkTheme : webLightTheme}>
      <div className="flex flex-col min-h-screen">
        <div className="grow px-5 py-10">
          {/* Backtester input and controls */}
          <div>
            <div className="mb-4">
              <h1 className="text-3xl font-bold">
                LSTM Trading Bot Backtester
              </h1>
            </div>
            <div className="flex flex-row flex-wrap gap-5">
              <div className="basis-1/3">
                <TickerInput
                  id="tickerInput"
                  value={ticker}
                  validationState={
                    ticker === validationInfo.ticker
                      ? validationInfo.validationState
                      : "none"
                  }
                  onChange={(e) => {
                    const newTicker = (e.target as HTMLInputElement).value;
                    setTicker(newTicker.toUpperCase());
                  }}
                  label="Ticker"
                  placeholder="Enter a ticker (compatible with Yahoo Finance)"
                />
              </div>
              <div className="flex items-center align-w-input">
                <Button
                  onClick={() => {
                    if (ticker !== "") {
                      determineValidationState(ticker);
                    }
                  }}
                >
                  Validate Ticker
                </Button>
              </div>
              <div className="flex flex-row gap-5">
                <div>
                  <DateInput
                    id="startDate"
                    label="Start Date"
                    value={dateInfo.startDate}
                    minDate={dateInfo.minDate}
                    maxDate={addDays(dateInfo.maxDate, -1)}
                    onSelectDate={(date) => {
                      if (date) {
                        setDateInfo({ ...dateInfo, startDate: date });
                        if (date >= dateInfo.endDate) {
                          setDateInfo({
                            ...dateInfo,
                            startDate: date,
                            endDate: addDays(date, 1),
                          });
                        }
                      }
                    }}
                  />
                </div>
                <div>
                  <DateInput
                    id="endDate"
                    label="End Date"
                    value={dateInfo.endDate}
                    minDate={addDays(dateInfo.startDate, 1)}
                    maxDate={dateInfo.maxDate}
                    onSelectDate={(date) => {
                      if (date) {
                        setDateInfo({ ...dateInfo, endDate: date });
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center align-w-input">
                <Button
                  appearance="primary"
                  disabled={
                    !(
                      ticker === validationInfo.ticker &&
                      validationInfo.validationState === "success"
                    )
                  }
                  onClick={async () => {
                    const requestDates = {
                      startDate: dateInfo.startDate,
                      endDate: dateInfo.endDate,
                    };
                    const response = await getPerformance(
                      ticker,
                      toServerTime(dateInfo.startDate),
                      toServerTime(dateInfo.endDate)
                    );
                    if (response.success) {
                      const result: performanceDataType[] = response.result;
                      setPerformanceData(reduceArray(result, 1000));
                      setChosenTicker(ticker);
                      setPerfDates(requestDates);
                    }
                  }}
                >
                  Backtest
                </Button>
              </div>
              {spinnerActive && <Spinner size="small" />}
            </div>
          </div>
          {/* Backtest performance results */}
          <hr className="my-5" />
          {performanceData && (
            <div className="flex flex-col h-[55rem]">
              <div className="flex-none">
                <h3 className="text-xl font-bold my-2">Backtest Results</h3>
                <p>
                  <span className="underline">Ticker:</span> {chosenTicker}
                </p>
                <p>
                  <span className="underline">Start Date:</span>{" "}
                  {perfDates?.startDate.toDateString()}
                </p>
                <p>
                  <span className="underline">End Date:</span>{" "}
                  {perfDates?.endDate.toDateString()}
                </p>
                <div className="my-3">
                  <h5 className="text-base text-center font-bold underline">
                    Total Returns
                  </h5>
                  <div className="flex justify-evenly">
                    <div className="font-bold">
                      {(() => {
                        const changeTotal = round(
                          performanceData[performanceData.length - 1]
                            .changeTotal,
                          roundingDigits
                        );
                        return (
                          <>
                            {chosenTicker}:{" "}
                            <span style={colouredReturnValue(changeTotal)}>
                              {changeTotal}%
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <div className="font-bold">
                      {(() => {
                        const impliedTotal = round(
                          performanceData[performanceData.length - 1]
                            .impliedTotal,
                          roundingDigits
                        );
                        return (
                          <>
                            LSTM Bot:{" "}
                            <span style={colouredReturnValue(impliedTotal)}>
                              {impliedTotal}%
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grow p-4">
                <PerformanceChart
                  ticker={chosenTicker}
                  perfData={performanceData}
                  widthPct={80}
                  roundingDigits={roundingDigits}
                  darkMode={darkMode}
                />
              </div>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="flex-none py-2 px-5">
          <hr className="my-5" />
          <Button onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>
      </div>
    </FluentProvider>
  );
}

export default App;
