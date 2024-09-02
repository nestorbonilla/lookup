'use server';

export async function fetchEthCode(address: string, network: string): Promise<string | null> {
  try {
    const apiKey = process.env.CHAINBASE_API_KEY;

    if (!apiKey) {
      return null;
    }

    const chainbaseUrl = `https://${network}.s.chainbase.online/v1/${apiKey}`;
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

    console.log('Fetching Ethereum contract code from Chainbase:', chainbaseUrl);

    const response = await fetch(chainbaseUrl, options);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();

    if (data.result) {
      return data.result;
    } else {
      console.error('Error fetching Ethereum contract code:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Error fetching Ethereum contract code:', error);
    return null;
  }
}
