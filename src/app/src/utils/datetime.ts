export const toBrowserTime = (date: string): Date => {
  date = date.replaceAll(" GMT", "");
  return new Date(date);
};

export const toServerTime = (date: Date): string => {
  const regex = /GMT.*/gi;
  return date.toString().replaceAll(regex, "GMT");
};
