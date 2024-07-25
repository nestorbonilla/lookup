import { hexToNumber, formatEther } from 'viem';

export const getNetworkId = (network: string) => {
  switch (network) {
    case 'base':
      return 'base-mainnet';
    case 'optimism':
      return 'optimism-mainnet';
    case 'arbitrum':
      return 'arbitrum-mainnet';
    default:
      console.log(`Unsupported network: ${network}`);
      return null;
  }
};

export const getEthCode = async (
  address: string,
  network: string
): Promise<string | null> => {
  const chainbaseUrl = `https://${network}.s.chainbase.online/v1/${process.env.CHAINBASE_API_KEY}`;
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_getCode',
      params: [address, 'latest']
    })
  };

  try {
    const response = await fetch(chainbaseUrl, options);
    const data = await response.json();

    if (data.error) {
      console.error(`Error fetching code for address ${address}:`, data.error);
      return null;
    }

    return data.result;
  } catch (err) {
    console.error(`Error fetching code for address ${address}:`, err);
    return null;
  }
};

export const getBalance = async (
  address: string,
  network: string
): Promise<number | null> => {
  const chainbaseUrl = `https://${network}.s.chainbase.online/v1/${process.env.CHAINBASE_API_KEY}`;
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [address, 'latest']
    })
  };

  try {
    const response = await fetch(chainbaseUrl, options);
    const data = await response.json();

    if (data.error) {
      console.error(`Error fetching balance for address ${address}:`, data.error);
      return null;
    }
    console.log(data.result);
    let balanceInHex = data.result;
    let balanceInWei = BigInt(hexToNumber(balanceInHex));
    let balance = Number(Number(formatEther(balanceInWei)).toFixed(4));
    console.log(balance);
    
    return balance;
  } catch (err) {
    console.error(`Error fetching balance for address ${address}:`, err);
    return null;
  }
};

export const getTxCount = async (
  address: string,
  network: string
): Promise<number | null> => {
  const chainbaseUrl = `https://${network}.s.chainbase.online/v1/${process.env.CHAINBASE_API_KEY}`;
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_getTransactionCount',
      params: [address, 'latest']
    })
  };

  try {
    const response = await fetch(chainbaseUrl, options);
    const data = await response.json();

    if (data.error) {
      console.error(`Error fetching tx count for address ${address}:`, data.error);
      return null;
    }
    console.log(data.result);
    let txCountInHex = data.result;
    let txCount = hexToNumber(txCountInHex);
    console.log(txCount);
    
    return txCount;
  } catch (err) {
    console.error(`Error fetching tx count for address ${address}:`, err);
    return null;
  }
};

type QueryResultColumn = {
  name: string;
  type: string;
};

type QueryResultData = {
  columns: QueryResultColumn[];
  data: (number | string)[][];
  execution_ended_at: string;
  execution_id: string;
  execution_started_at: string;
  execution_time_millis: number;
  expires_at: string;
  message: string;
  peak_memory_bytes: number;
  pending_time_millis: number;
  query_id: number;
  status: string;
  submitted_at: string;
  total_row_count: number;
};

type QueryResponse = {
  code: number;
  data: QueryResultData;
  message: string;
};

export type QueryResult = {
  // general params
  txCount?: number;
  fromAddress?: string;
  toAddress?: string;
  hash?: string;
  blockTimestamp?: string;
  // contract params
  address?: string;
  isErc20?: number;
  isErc721?: number;
  // address params
  lastTxTimestamp?: string;
  // tx params
  gas?: number;
  value?: number;
};

export const getQueryResults = async (
  queryId: string,
  address: string
): Promise<QueryResult | null> => {
  const apiKey = process.env.CHAINBASE_API_KEY || "";
  const data = {
    queryParameters: {
      param_address: address
    },
  };
  const headers = {
    "X-API-KEY": apiKey,
    "Content-Type": "application/json",
  };

  async function executeQuery(queryId: string): Promise<string> {
    const response = await fetch(
      `https://api.chainbase.com/api/v1/query/${queryId}/execute`,
      { method: "POST", headers, body: JSON.stringify(data) }
    );
    const responseData = await response.json();
    return responseData.data[0].executionId;
  }

  async function checkStatus(executionId: string): Promise<{ status: string; progress: number }> {
    const response = await fetch(
      `https://api.chainbase.com/api/v1/execution/${executionId}/status`,
      { headers }
    );
    const data = await response.json();
    return data.data[0];
  }

  async function getResults(executionId: string): Promise<QueryResponse> {
    const response = await fetch(
      `https://api.chainbase.com/api/v1/execution/${executionId}/results`,
      { headers }
    );
    return response.json();
  }

  try {
    const executionId = await executeQuery(queryId);
    let status: string;
    do {
      const statusResponse = await checkStatus(executionId);
      status = statusResponse.status;
      const progress = statusResponse.progress;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(`${status} ${progress} %`);
    } while (status !== "FINISHED" && status !== "FAILED");

    if (status === "FAILED") {
      throw new Error("Query execution failed");
    }

    const results = await getResults(executionId);
    
    if (results.code === 200 && results.data.data && results.data.data.length > 0) {
      const resultData = results.data.data[0];
      
      switch (queryId) {
        case "690032":
          return {
            txCount: resultData[0] as number,
            lastTxTimestamp: resultData[1] as string
          };
        case "690033":
          return {
            address: resultData[0] as string,
            fromAddress: resultData[1] as string,
            hash: resultData[2] as string,
            blockTimestamp: resultData[3] as string,
            isErc20: resultData[4] as number,
            isErc721: resultData[5] as number,
            txCount: resultData[6] as number
          };
        case "690035":
          return {
            hash: resultData[0] as string,
            fromAddress: resultData[1] as string,
            toAddress: resultData[2] as string,
            gas: resultData[3] as number,
            value: resultData[4] as number,
            blockTimestamp: resultData[5] as string,
          };
        default:
          console.error("Unsupported query ID:", queryId);
          return null;
      }
    } else {
      console.error("Unexpected result format:", results);
      return null;
    }
  } catch (err) {
    console.error(`Error executing query for address ${address}:`, err);
    return null;
  }
};