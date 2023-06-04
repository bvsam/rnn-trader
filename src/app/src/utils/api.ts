export const getTickerInfo = async (ticker: string) => {
  const response = await fetch(`/api/info/${ticker}`);

  return response.json();
};

export const getPerformance = async (
  ticker: string,
  startDate: Date,
  endDate: Date
) => {
  const params = new URLSearchParams({
    startDate: `${startDate.getTime() / 1000}`,
    endDate: `${endDate.getTime() / 1000}`,
  });
  const response = await fetch(
    `/api/performance/${ticker}?${params.toString()}`
  );

  return response.json();
};
