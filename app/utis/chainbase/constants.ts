import { hexToNumber, formatEther } from 'viem';

export const getNetworkId = (network: string) => {
  switch (network) {
    case 'ethereum':
      return 'ethereum-mainnet';
    case 'base':
      return 'base-mainnet';
    case 'optimism':
      return 'optimism-mainnet';
    case 'arbitrum':
      return 'arbitrum-mainnet';
    default:
      return 'ethereum-mainnet';
  }
};

export const getNetworkIdNumber = (network: string) => {
  switch (network) {
    case 'ethereum':
      return 1;
    case 'base':
      return 8453;
    case 'optimism':
      return 10;
    case 'arbitrum':
      return 42161;
    default:
      return 1;
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
    
    let balanceInHex = data.result;
    let balanceInWei = BigInt(hexToNumber(balanceInHex));
    let balance = Number(Number(formatEther(balanceInWei)).toFixed(4));
    
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
    let txCountInHex = data.result;
    let txCount = hexToNumber(txCountInHex);    
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
  bytecode?: string;
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
  network: string,
  address: string,
): Promise<QueryResult | null> => {
  const apiKey = process.env.CHAINBASE_API_KEY || "";
  const data = {
    queryParameters: {
      network,
      address,
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
            bytecode: resultData[6] as string,
            txCount: resultData[7] as number,
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

export const getTokenInfo = async (
  address: string,
  network: string,
  isErc721: boolean,
  isErc20: boolean
): Promise<{
  name: string;
  totalSupply: string;
  decimals: number;
  tokenCount: string;
  deployedBy: string;
  compilerVersion: string;
} | null> => {
  const networkId = getNetworkIdNumber(network);
  const options = {
    method: 'GET',
    headers: { 'x-api-key': process.env.CHAINBASE_API_KEY! }
  };

  try {
    let name = '';
    let totalSupply = '';
    let decimals = 0;
    let tokenCount = '';
    let deployedBy = '';
    let compilerVersion = '';

    if (isErc721) {
      const response = await fetch(`https://api.chainbase.online/v1/nft/collection?chain_id=${networkId}&contract_address=${address}`, options);
      const nftData = await response.json();
      
      if (nftData.data) {
        name = nftData.data.name;
        totalSupply = nftData.data.total_supply || '';
        tokenCount = totalSupply;
      }
    } else if (isErc20) {
      const response = await fetch(`https://api.chainbase.online/v1/token/metadata?chain_id=${networkId}&contract_address=${address}`, options);
      const tokenData = await response.json();

      if (tokenData.data) {
        name = tokenData.data.name;
        totalSupply = tokenData.data.total_supply;
        decimals = tokenData.data.decimals;
        tokenCount = (Number(totalSupply) / (10 ** decimals)).toString();
      }
    }

    return { name, totalSupply, decimals, tokenCount, deployedBy, compilerVersion };
  } catch (err) {
    console.error(`Error fetching token info for address ${address}:`, err);
    return null;
  }
};

export const getTxDetails = async (
  txHash: string,
  network: string
): Promise<{
  sender: string;
  receiver: string;
  dateTime: string;
  amountSent: string;
  gasFee: string;
  status: string;
  txHash: string;
  gasUsed: string;
} | null> => {
  const networkId = getNetworkIdNumber(network);
  const options = {
    method: 'GET',
    headers: { 'x-api-key': process.env.CHAINBASE_API_KEY! }
  };

  try {
    const url = `https://api.chainbase.online/v1/tx/detail?chain_id=${networkId}&hash=${txHash}`;
    console.log(`Fetching transaction details from: ${url}`);
    
    const response = await fetch(url, options);
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      const errorText = await response.text();
      console.error(`Error response: ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));

    if (data.code !== 0 || !data.data) {
      console.error(`API error for hash ${txHash}:`, data.message || 'Unknown error');
      return null;
    }

    const txData = data.data;

    const valueInEther = txData.value === '0' ? '0.0000' : formatEther(BigInt(txData.value));
    const gasFeeInEther = formatEther(BigInt(txData.tx_fee));
    const gasUsed = txData.gas_used.toString();

    return {
      sender: txData.from_address,
      receiver: txData.to_address,
      dateTime: new Date(txData.block_timestamp).toLocaleString(),
      amountSent: `${valueInEther} ETH`,
      gasFee: `${gasFeeInEther} ETH`,
      status: txData.status === 1 ? 'Success' : 'Failed',
      txHash: txData.transaction_hash,
      gasUsed
    };
  } catch (err) {
    console.error(`Error fetching transaction details for hash ${txHash}:`, err);
    return null;
  }
};