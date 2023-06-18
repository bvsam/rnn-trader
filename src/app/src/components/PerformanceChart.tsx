import {
  AnimatedAxis,
  AnimatedGrid,
  AnimatedLineSeries,
  Tooltip,
  XYChart,
} from "@visx/xychart";
import { ParentSize } from "@visx/responsive";
import { performanceDataType, round, colouredReturnValue } from "../utils/data";

type PerformanceChartProps = {
  ticker: string;
  perfData: performanceDataType[];
  widthPct?: number;
  heightPct?: number;
  roundingDigits?: number;
  darkMode?: boolean;
};

const defaultStratAccessors = {
  xAccessor: (d: performanceDataType) => d.date,
  yAccessor: (d: performanceDataType) => d.changeTotal,
};

const tradingStratAccessors = {
  xAccessor: (d: performanceDataType) => d.date,
  yAccessor: (d: performanceDataType) => d.impliedTotal,
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
          <XYChart
            width={(width * widthPct) / 100}
            height={(height * heightPct) / 100}
            xScale={{ type: "band" }}
            yScale={{ type: "linear" }}
          >
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
            <AnimatedLineSeries
              dataKey="defaultStrat"
              data={perfData}
              {...defaultStratAccessors}
            />
            <AnimatedLineSeries
              dataKey="tradingStrat"
              data={perfData}
              {...tradingStratAccessors}
            />
            <Tooltip<performanceDataType>
              showVerticalCrosshair
              showSeriesGlyphs
              renderTooltip={({ tooltipData, colorScale }) => {
                if (!(tooltipData?.nearestDatum && colorScale)) {
                  return null;
                }

                const date = defaultStratAccessors.xAccessor(
                  tooltipData.nearestDatum.datum
                );

                const tradingStratReturn = round(
                  tradingStratAccessors.yAccessor(
                    tooltipData.datumByKey.tradingStrat.datum
                  ),
                  roundingDigits
                );
                const tradingStratChange = round(
                  tooltipData.datumByKey.tradingStrat.datum.change,
                  roundingDigits
                );

                const defaultStratReturn = round(
                  defaultStratAccessors.yAccessor(
                    tooltipData.datumByKey.defaultStrat.datum
                  ),
                  roundingDigits
                );
                const defaultStratChange = round(
                  tooltipData.datumByKey.defaultStrat.datum.implied,
                  roundingDigits
                );

                return (
                  <div>
                    <p>{date}</p>
                    <p
                      style={{
                        color: colorScale(
                          tooltipData.datumByKey.defaultStrat.key
                        ),
                      }}
                    >
                      {ticker}:{" "}
                      <span style={colouredReturnValue(defaultStratReturn)}>
                        {defaultStratReturn}%
                      </span>{" "}
                      <span style={colouredReturnValue(tradingStratChange)}>
                        ({tradingStratChange}%)
                      </span>
                    </p>
                    <p
                      style={{
                        color: colorScale(
                          tooltipData.datumByKey.tradingStrat.key
                        ),
                      }}
                    >
                      LSTM Bot:{" "}
                      <span style={colouredReturnValue(tradingStratReturn)}>
                        {tradingStratReturn}%
                      </span>{" "}
                      <span style={colouredReturnValue(defaultStratChange)}>
                        ({defaultStratChange}%)
                      </span>
                    </p>
                  </div>
                );
              }}
            />
          </XYChart>
        </div>
      )}
    </ParentSize>
  );
}
