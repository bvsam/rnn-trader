export const getTickerInfo = async (ticker: string) => {
  const response = await (await fetch(`/api/info/${ticker}`)).json();
  return response;
};
