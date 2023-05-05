import "./App.css";
import { Button } from "@fluentui/react-components";
import TickerInput, { validationStateTypes } from "./components/TickerInput";
import DateInput from "./components/DateInput";
import { useState } from "react";
import { addDays } from "@fluentui/react-datepicker-compat";
import { getTickerInfo } from "./utils/api";
import { toBrowserTime } from "./utils/datetime";

type validationInfoType = {
  ticker: string;
  validationState: validationStateTypes;
};
type dateInfoType = {
  startDate: Date;
  endDate: Date;
  minDate: Date;
  maxDate: Date;
};

function App() {
  const startDate = new Date(new Date().setHours(0, 0, 0, 0));
  const [dateInfo, setDateInfo] = useState<dateInfoType>({
    startDate: startDate,
    endDate: addDays(startDate, 1),
    minDate: addDays(startDate, -1),
    maxDate: addDays(startDate, 2),
  });
  const [ticker, setTicker] = useState("");
  const [validationInfo, setValidationInfo] = useState<validationInfoType>({
    ticker: "",
    validationState: "none",
  });
  const determineValidationState = async (newTicker: string) => {
    switch (newTicker) {
      case "":
        setValidationInfo({ ticker: newTicker, validationState: "none" });
        break;
      default: {
        const response = await getTickerInfo(newTicker);
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

  return (
    <div className="mx-5 my-10">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">LSTM Trading Bot Backtester</h1>
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
        <div className="flex items-center pt-2">
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
        <div className="flex items-center pt-2">
          <Button
            appearance="primary"
            disabled={
              !(
                ticker === validationInfo.ticker &&
                validationInfo.validationState === "success"
              )
            }
          >
            Backtest
          </Button>
        </div>
      </div>
    </div>
  );
}

export default App;
