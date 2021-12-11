import { DynamoDB } from 'aws-sdk';
import { ConnectContactFlowEvent, ConnectContactFlowCallback, Context, ConnectContactFlowResult } from 'aws-lambda';

const wordlist = require('an-array-of-english-words') as string[];

export const handler = async (
  event: ConnectContactFlowEvent,
  context: Context,
  callback: ConnectContactFlowCallback,
) => {
  try {
    const dynamoDb = new DynamoDB.DocumentClient();
    const phone = event.Details.ContactData.CustomerEndpoint?.Address as string;
    const vanityNumbers = await getVanityNumbers(phone, 5, dynamoDb);
    const vanityNumbersTextToSpeech = vanityNumbers.slice(0, 3).join(', ')
    const resultMap = { phone, vanity_numbers: vanityNumbersTextToSpeech };
    console.log("OK");
    return resultMap;
  } catch (err) {
    console.log("ERROR");
    console.log(err);
    throw err;
  }
};

const getVanityNumbers = async (phone: string, count: number, dynamoDb: DynamoDB.DocumentClient): Promise<string[]> => {
  var vanityNumbers = await readVanityNumbersFromDb(phone, dynamoDb);
  console.log("Vanity numbers from DB", vanityNumbers);
  if (!vanityNumbers) {
    console.log("Generating vanity numbers");
    vanityNumbers = generateVanityNumbers(phone, count);
    console.log("Saving to DB");
    await saveVanityNumbersToDb(phone, vanityNumbers, dynamoDb);
  }
  return vanityNumbers;
}

const makeWords = (digits: string): string[] => {
  const keyboardMap = new Map([
    ['2', 'ABC'],
    ['3', 'DEF'],
    ['4', 'GHI'],
    ['5', 'JKL'],
    ['6', 'MNO'],
    ['7', 'PQRS'],
    ['8', 'TUV'],
    ['9', 'WXYZ']
  ]);
  let results: string[] = [''];
  let buffer: string[] = [];
  let chars: string | undefined;
  for (let i = 0; i < digits.length; i++) {
    chars = keyboardMap.get(digits.charAt(i));
    if (chars) {
      for (let word of results) {
        for (let j = 0; j < chars.length; j++) {
          buffer.push(word + chars.charAt(j))
        }
      }
      results = buffer;
      buffer = [];
      continue;
    }
    return [];
  }
  return results;
};

const generateVanityNumbers = (phone: string, count: number): string[] => {
  const vanityMinDigitCount = 2;
  const vanityMaxDigitCount = 5;
  if (!phone || phone.length < vanityMaxDigitCount) {
    throw new Error(`Phone number is too short (min length: ${vanityMaxDigitCount})`);
  }
  let offset = 0;
  let results: string[] = [];
  let vanityDigits: string;
  let words: string[];
  do {
    vanityDigits = phone.substring(phone.length - vanityMaxDigitCount, phone.length - offset);
    words = makeWords(vanityDigits);
    let w: string;
    let x: number;
    let y: number;
    let vanityNumber: string;
    for (let originalWord of words) {
      if (originalWord.length < vanityMinDigitCount) {
        continue;
      }
      w = originalWord;
      x = 0;
      y = originalWord.length;
      while (w.length >= vanityMinDigitCount) {
        if (wordlist.indexOf(w.toLowerCase()) !== -1) {
          vanityNumber =
            phone.substring(0, phone.length - vanityMaxDigitCount + x)
            + w
            + phone.substring(phone.length - vanityMaxDigitCount + y);
          if (results.indexOf(vanityNumber) === -1) {
            results.push(vanityNumber);
            break;
          }
        }
        w = w.substring(0, w.length - 1);
        y--;
      }
      w = originalWord;
      x = 0;
      y = originalWord.length;
      while (w.length >= vanityMinDigitCount) {
        if (wordlist.indexOf(w.toLowerCase()) !== -1) {
          vanityNumber =
            phone.substring(0, phone.length - vanityMaxDigitCount + x)
            + w
            + phone.substring(phone.length - vanityMaxDigitCount + y);
          if (results.indexOf(vanityNumber) === -1) {
            results.push(vanityNumber);
            break;
          }
        }
        w = w.substring(1);
        x++;
      }
      if (results.length === count) {
        break;
      }
    }
  } while (offset++ < vanityMaxDigitCount && !(words && words.length > 0));
  if (results.length === 0) {
    // add customer phone as a fallback
    results.push(phone);
  } else {
    // sort matches by number of word characters inside the generated number
    const _results = results.map(phone => {
      const matches = phone.match(/([A-Z]+)/);
      let score = 0;
      if (matches && matches.length > 0) {
        score = matches[0].length;
      }
      return { phone, score };
    });
    _results.sort(({ phone: a, score: aScore }, { phone: b, score: bScore }) => bScore - aScore);
    results = _results.map(x => x.phone);
  }
  console.log({ phone, results });
  return results;
};

const readVanityNumbersFromDb = async (phone: string, dynamoDb: DynamoDB.DocumentClient): Promise<string[] | null> => {
  const outputTableName = process.env['OUTPUT_TABLE_NAME'];
  if (!outputTableName) {
    throw new Error('Missing required environment variable: OUTPUT_TABLE_NAME');
  }
  const row = await dynamoDb.get({
    Key: { phone },
    TableName: outputTableName
  }).promise();
  if (row && row.Item) {
    console.log("Read numbers from db: found", row);
    return row.Item.vanity_numbers;
  }
  console.log("Read numbers from db: not found");
  return null;
};

const saveVanityNumbersToDb = async (phone: string, vanityNumbers: string[], dynamoDb: DynamoDB.DocumentClient): Promise<void> => {
  const outputTableName = process.env['OUTPUT_TABLE_NAME'];
  if (!outputTableName) {
    throw new Error('Missing required environment variable: OUTPUT_TABLE_NAME');
  }
  console.log("Save numbers to db");
  await dynamoDb.put({
    ConditionExpression: 'attribute_not_exists(phone)',
    Item: {
      phone,
      vanity_numbers: vanityNumbers,
    },
    ReturnConsumedCapacity: 'TOTAL',
    TableName: outputTableName
  }).promise();
};