import { createPublicClient, http } from 'viem';
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

// Bytecode

export const getCompilerVersion = (bytecode: string): string => {
  const cleanBytecode = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;

  // Try different patterns
  const patterns = [
    /a264697066735822.*?64736f6c6343(\w{6})/,  // IPFS + solc
    /64736f6c6343(\w{6})/,                     // Just solc
    /(?:5b)?64736f6c6343(\w{6})(?:5d)?/        // Potential brackets
  ];

  for (const pattern of patterns) {
    const match = cleanBytecode.match(pattern);
    if (match) {
      const version = match[1];
      const major = parseInt(version.slice(0, 2), 16);
      const minor = parseInt(version.slice(2, 4), 16);
      const patch = parseInt(version.slice(4, 6), 16);
      return `0.${major}.${minor}.${patch}`;
    }
  }

  // If no match found, try to find any hexadecimal sequence that could be a version
  const generalMatch = cleanBytecode.match(/64736f6c63(\w{6})/);
  if (generalMatch) {
    return `0.${parseInt(generalMatch[1].slice(0, 2), 16)}.${parseInt(generalMatch[1].slice(2, 4), 16)}`;
  }

  return 'Unknown';
}