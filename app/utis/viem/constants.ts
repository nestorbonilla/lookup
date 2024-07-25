import { createPublicClient, http, erc20Abi } from 'viem';
import { base, optimism, arbitrum, mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

const getClient = (network: string) => {
  let client = createPublicClient({
    chain: getViemNetwork(network),
    transport: http(), //http(getAlchemyRpc(network)),
  });
  return client;
};

const getMainnetClient = () => {
  let client = createPublicClient({
    chain: mainnet,
    transport: http(), //http(getAlchemyRpc(network)),
  });
  return client;
};

const getViemNetwork = (network: string) => {
  switch (network) {
    case 'mainnet':
      return mainnet;
    case 'base':
      return base;
    case 'optimism':
      return optimism;
    case 'arbitrum':
      return arbitrum;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
};

export const getEnsAddress = async (
  paramAddress: string
): Promise<any> => {
  let client = getMainnetClient();
  const ensAddress = await client.getEnsAddress({
    name: normalize(paramAddress),
  });
  return ensAddress;
};

export const getErc20Allowance = async (
  userAddress: string,
  tokenAddress: string,
  lockAddress: string,
  network: string
): Promise<any> => {
  let client = getClient(network);
  const allowance = await client.readContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [userAddress as `0x${string}`, lockAddress as `0x${string}`],
  });
  return allowance;
};

export const getErc20Symbol = async (
  tokenAddress: string,
  network: string
): Promise<any> => {
  let client = getClient(network);
  const symbol = await client.readContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'symbol',
    args: [],
  });
  return symbol;
};

export const getErc20Decimals = async (
  tokenAddress: string,
  network: string
): Promise<any> => {
  let client = getClient(network);
  const allowance = await client.readContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'decimals',
    args: [],
  });
  return allowance;
};
