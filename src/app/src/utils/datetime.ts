export const toBrowserTime = (date: string): Date => {
  date = date.replaceAll(" GMT", "");
  return new Date(date);
};

export const toServerTime = (date: Date): Date => {
  const regex = /GMT.*/gi;
  return new Date(date.toString().replaceAll(regex, "GMT"));
};
