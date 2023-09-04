import {
  AnimatedAxis,
  AnimatedGrid,
  AnimatedLineSeries,
  Tooltip,
  XYChart,
  DataContext,
  DataProvider,
} from "@visx/xychart";
import { ParentSize } from "@visx/responsive";
import { performanceDataType, round, colouredReturnValue } from "../utils/data";
import { LegendOrdinal } from "@visx/legend";
import { useContext } from "react";

type PerformanceChartProps = {
  ticker: string;
  perfData: performanceDataType[];
  widthPct?: number;
  heightPct?: number;
  roundingDigits?: number;
  darkMode?: boolean;
};

const defaultStrategyAccessors = {
  xAccessor: (d: performanceDataType) => d.date,
  yAccessor: (d: performanceDataType) => d.changeTotal,
};

const tradingStrategyAccessors = {
  xAccessor: (d: performanceDataType) => d.date,
  yAccessor: (d: performanceDataType) => d.impliedTotal,
};

const ChartLegend = () => {
  const { colorScale, margin, innerWidth } = useContext(DataContext);

  return colorScale && margin && innerWidth ? (
    <LegendOrdinal
      direction="column"
      itemMargin="4px 8px"
      scale={colorScale}
      shape="line"
      style={{
        position: "absolute",
        marginTop: margin.top + 35,
        marginRight: innerWidth - 220,
        border: "1px solid",
        padding: 10,
        fontWeight: "bold",
      }}
    />
  ) : null;
};

export default function PerformanceChart({
  ticker,
  perfData,
  widthPct = 100,
  heightPct = 100,
  roundingDigits = 2,
  darkMode = false,
}: PerformanceChartProps) {
  const themeColour = darkMode ? "white" : "black";
  const commonLabelProps = {
    fill: themeColour,
    style: { fontWeight: "bold" },
  };

  return (
    <ParentSize>
      {({ width, height }) => (
        <div className="flex justify-center">
          <DataProvider xScale={{ type: "band" }} yScale={{ type: "linear" }}>
            <XYChart
              width={(width * widthPct) / 100}
              height={(height * heightPct) / 100}
              xScale={{ type: "band" }}
              yScale={{ type: "linear" }}
            >
              {/* X and Y axes */}
              <AnimatedAxis
                orientation="left"
                label="Total Return"
                labelProps={{
                  ...commonLabelProps,
                  dx: -22,
                  dy: 45,
                }}
                tickLabelProps={{ fill: themeColour }}
                stroke={themeColour}
              />
              <AnimatedAxis
                orientation="bottom"
                label="Date"
                labelProps={{
                  ...commonLabelProps,
                  dx: -14,
                  dy: 10,
                }}
                tickLabelProps={{ fill: themeColour }}
                stroke={themeColour}
                strokeWidth={1}
              />
              <AnimatedGrid columns={false} numTicks={4} />
              {/* Main line series with ticker and backtested LSTM performance data */}
              <AnimatedLineSeries
                dataKey={ticker}
                data={perfData}
                {...defaultStrategyAccessors}
              />
              <AnimatedLineSeries
                dataKey="LSTM Bot"
                data={perfData}
                {...tradingStrategyAccessors}
              />

              {/* Tooltip */}
              <Tooltip<performanceDataType>
                showVerticalCrosshair
                showSeriesGlyphs
                renderTooltip={({ tooltipData, colorScale }) => {
                  if (!(tooltipData?.nearestDatum && colorScale)) {
                    return null;
                  }

                  const date = defaultStrategyAccessors.xAccessor(
                    tooltipData.nearestDatum.datum
                  );

                  const tradingStrategyReturn = round(
                    tradingStrategyAccessors.yAccessor(
                      tooltipData.datumByKey["LSTM Bot"].datum
                    ),
                    roundingDigits
                  );
                  const tradingStrategyChange = round(
                    tooltipData.datumByKey["LSTM Bot"].datum.change,
                    roundingDigits
                  );

                  const defaultStrategyReturn = round(
                    defaultStrategyAccessors.yAccessor(
                      tooltipData.datumByKey[ticker].datum
                    ),
                    roundingDigits
                  );
                  const defaultStrategyChange = round(
                    tooltipData.datumByKey[ticker].datum.implied,
                    roundingDigits
                  );

                  return (
                    <div>
                      <p>{date}</p>
                      <p
                        style={{
                          color: colorScale(tooltipData.datumByKey[ticker].key),
                        }}
                      >
                        {ticker}:{" "}
                        <span
                          style={colouredReturnValue(defaultStrategyReturn)}
                        >
                          {defaultStrategyReturn}%
                        </span>{" "}
                        <span
                          style={colouredReturnValue(tradingStrategyChange)}
                        >
                          ({tradingStrategyChange}%)
                        </span>
                      </p>
                      <p
                        style={{
                          color: colorScale(
                            tooltipData.datumByKey["LSTM Bot"].key
                          ),
                        }}
                      >
                        LSTM Bot:{" "}
                        <span
                          style={colouredReturnValue(tradingStrategyReturn)}
                        >
                          {tradingStrategyReturn}%
                        </span>{" "}
                        <span
                          style={colouredReturnValue(defaultStrategyChange)}
                        >
                          ({defaultStrategyChange}%)
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
            </XYChart>
            <ChartLegend />
          </DataProvider>
        </div>
      )}
    </ParentSize>
  );
}
