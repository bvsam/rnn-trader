export type performanceDataType = {
  change: number;
  changeTotal: number;
  date: string;
  implied: number;
  impliedTotal: number;
  prediction: boolean;
  target: boolean;
};

export const colouredReturnValue = (
  returnValue: number,
  positiveColour = "green",
  negativeColour = "red"
) => {
  return {
    color: returnValue >= 0 ? positiveColour : negativeColour,
  };
};

export const round = (num: number, ndigits: number) => {
  const multiplier = Math.pow(10, ndigits);
  return Math.round(num * multiplier) / multiplier;
};

export const reduceArray = (
  array: performanceDataType[],
  size: number
): performanceDataType[] => {
  const denominator = Math.floor(array.length / size);
  return fractionOfArray(array, denominator + 1);
};

const fractionOfArray = (
  array: performanceDataType[],
  denominator: number
): performanceDataType[] => {
  const lastItem = array[array.length - 1];
  array = array.slice(0, -1);

  let count = 1;
  while (array.splice(count, denominator - 1).length !== 0) {
    count += 1;
  }
  array.push(lastItem);

  return array;
};
