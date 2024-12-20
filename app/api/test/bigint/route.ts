import Decimal from 'decimal.js';
import BigNumber from 'bignumber.js';
import Long from 'long';

export async function GET() {
  const bigNumber = "857722012482092688";
  
  interface Results {
    // Native JavaScript
    asNumber: number;
    asBigInt: string;
    bigIntToString: string;
    bigIntToNumber: number;
    
    // Decimal.js
    decimalJs: {
      value: string;
      toNumber: number;
      toString: string;
    };
    
    // BigNumber.js
    bigNumberJs: {
      value: string;
      toNumber: number;
      toString: string;
    };
    
    // Long.js
    longJs: {
      value: string;
      toNumber: number;
      toString: string;
      high32: number;
      low32: number;
    };
  }
  
  const results: Results = {
    // Native JavaScript tests
    asNumber: Number(bigNumber),
    asBigInt: BigInt(bigNumber).toString(),
    bigIntToString: BigInt(bigNumber).toString(),
    bigIntToNumber: Number(BigInt(bigNumber)),
    
    // Decimal.js tests
    decimalJs: {
      value: new Decimal(bigNumber).valueOf(),
      toNumber: new Decimal(bigNumber).toNumber(),
      toString: new Decimal(bigNumber).toString()
    },
    
    // BigNumber.js tests
    bigNumberJs: {
      value: new BigNumber(bigNumber).valueOf(),
      toNumber: new BigNumber(bigNumber).toNumber(),
      toString: new BigNumber(bigNumber).toString()
    },
    
    // Long.js tests
    longJs: {
      value: Long.fromString(bigNumber).toString(),
      toNumber: Long.fromString(bigNumber).toNumber(),
      toString: Long.fromString(bigNumber).toString(),
      high32: Long.fromString(bigNumber).high,
      low32: Long.fromString(bigNumber).low
    }
  };

  return Response.json(results);
} 