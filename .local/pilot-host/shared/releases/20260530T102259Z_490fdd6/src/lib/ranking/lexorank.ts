const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const MIN_DIGIT = 0;
const MAX_DIGIT = ALPHABET.length - 1;
const MID_DIGIT = Math.floor(ALPHABET.length / 2);

function rankToDigits(rank: string): number[] {
  if (!rank) {
    throw new Error("Invalid rank");
  }

  return [...rank].map((char) => {
    const digit = ALPHABET.indexOf(char);

    if (digit === -1) {
      throw new Error("Invalid rank");
    }

    return digit;
  });
}

function digitsToRank(digits: number[]) {
  return digits.map((digit) => ALPHABET[digit]).join("");
}

function createBetween(leftDigits: number[], rightDigits: number[]): string {
  const result: number[] = [];
  let index = 0;

  while (true) {
    const left = leftDigits[index] ?? MIN_DIGIT;
    const right = rightDigits[index] ?? MAX_DIGIT;

    if (right - left > 1) {
      result.push(Math.floor((left + right) / 2));
      return digitsToRank(result);
    }

    result.push(left);
    index += 1;
  }
}

export function createInitialRank() {
  return ALPHABET[MID_DIGIT];
}

export function createRankBefore(rank: string) {
  const rightDigits = rankToDigits(rank);
  const nextRank = createBetween([], rightDigits);

  if (!(nextRank < rank)) {
    throw new Error("Invalid rank");
  }

  return nextRank;
}

export function createRankAfter(rank: string) {
  const leftDigits = rankToDigits(rank);
  const nextRank = createBetween(leftDigits, []);

  if (!(rank < nextRank)) {
    throw new Error("Invalid rank");
  }

  return nextRank;
}

export function createRankBetween(leftRank: string, rightRank: string) {
  if (!(leftRank < rightRank)) {
    throw new Error("Invalid rank");
  }

  const leftDigits = rankToDigits(leftRank);
  const rightDigits = rankToDigits(rightRank);
  const nextRank = createBetween(leftDigits, rightDigits);

  if (!(leftRank < nextRank && nextRank < rightRank)) {
    throw new Error("Invalid rank");
  }

  return nextRank;
}
