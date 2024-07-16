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
      throw new Error(`Unsupported network: ${network}`);
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