/** @jsxImportSource frog/jsx */

import { Button, FrameContext, Frog } from 'frog';
import { Box, Heading, Text, VStack, Spacer, vars } from '@/app/utis/frog/ui';
import { devtools } from 'frog/dev'
import { neynar, type NeynarVariables } from 'frog/middlewares';
import { handle } from 'frog/next';
import { serveStatic } from 'frog/serve-static';
import neynarClient from '@/app/utis/neynar/client';
import {
  Cast,
  ValidateFrameActionResponse,
} from '@neynar/nodejs-sdk/build/neynar-api/v2';
import { isAddress } from 'viem';
import { getBalance, getEthCode, getNetworkId, getQueryResults, QueryResult } from '@/app/utis/chainbase/constants';
import { getEnsAddress } from '@/app/utis/viem/constants';

interface AnalysisResult {
  valid: boolean;
  paramType: string;
}

const app = new Frog({
  title: 'LookUp',
  assetsPath: '/',
  basePath: '/api',
  ui: { vars },
  imageOptions: {
    format: 'png',
  },
  verify: process.env.NODE_ENV === 'production',
});

const neynarMiddleware = neynar({
  apiKey: process.env.NEYNAR_API_KEY!,
  features: ['interactor', 'cast'],
});

// Uncomment to use Edge Runtime
// export const runtime = 'edge'

enum ApiRoute {
  HOOK_ANALYZE = 'HOOK-SETUP',
  FRAME_ANALYZE = 'FRAME-ANALYZE/:CHAIN/:PARAMETER'
}

enum HookAnalyzeResult {
  ANALYZE_TEXT,
  CAST_SUCCESS,
  CAST_ERROR,
  INVALID_AUTHOR,
  UNEXPECTED_ERROR,
  ROUTE_ERROR,
}

enum FrameAnalyzeResult {
  CAST_SUCCESS,
  CAST_ERROR,
  INVALID_AUTHOR,
  UNEXPECTED_ERROR,
  ROUTE_ERROR,
  FRAME_ACTION_VALID,
  FRAME_ACTION_INVALID
}

const statusMessage = {
  [ApiRoute.HOOK_ANALYZE]: {
    [HookAnalyzeResult.ANALYZE_TEXT]: `${ApiRoute.HOOK_ANALYZE} => CAST TEXT COMPLY WITH THE PATTERN.`,
    [HookAnalyzeResult.CAST_SUCCESS]: `${ApiRoute.HOOK_ANALYZE} => CAST SENT SUCCESSFULLY`,
    [HookAnalyzeResult.CAST_ERROR]: `${ApiRoute.HOOK_ANALYZE} => FAILED TO PUBLISH CAST`,
    [HookAnalyzeResult.INVALID_AUTHOR]: `${ApiRoute.HOOK_ANALYZE} => CAST AUTHOR IS NOT CHANNEL OWNER`,
    [HookAnalyzeResult.UNEXPECTED_ERROR]: `${ApiRoute.HOOK_ANALYZE} => POINT SHOULD NOT BE REACHED, CHECK NEYNAR HOOK`,
    [HookAnalyzeResult.ROUTE_ERROR]: `${ApiRoute.HOOK_ANALYZE} => ROUTE ERROR`,
  },
  [ApiRoute.FRAME_ANALYZE]: {
    [FrameAnalyzeResult.FRAME_ACTION_VALID]: `${ApiRoute.FRAME_ANALYZE} => FRAME ACTION IS VALID`,
    [FrameAnalyzeResult.FRAME_ACTION_INVALID]: `${ApiRoute.FRAME_ANALYZE} => FRAME ACTION IS INVALID`,
    [FrameAnalyzeResult.CAST_SUCCESS]: `${ApiRoute.FRAME_ANALYZE} => FRAME ACTION IS VALID`,
    [FrameAnalyzeResult.CAST_ERROR]: `${ApiRoute.FRAME_ANALYZE} => FRAME ACTION IS INVALID`,
  },
};

app.composerAction(
  '/',
  (c) => {
    return c.res({
      title: 'LookUp Composer Action',
      url: `${process.env.NEXT_PUBLIC_APP_URL}` 
    })
  },
  {
    name: 'LookUp Composer Action',
    description: 'Check details of an EOA, Contract, Transaction, or ENS name',
    icon: 'image',
    imageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/logo-light.svg`,
  }
);

app.hono.post('/hook-analyze', async (c) => {
  try {
    console.log('call start: hook-validate');
    let castText = '';

    const body = await c.req.json();
    let cast: Cast = body.data;
    
    const textToAnalyze = cast.text.toLowerCase().trim();
    const [command, param, network] = textToAnalyze.split(" ");

    let {valid, paramType} = await isAnalyzeCast(command, param, network);
    if (!valid || paramType === 'invalid') {
      return c.json({
        message:
          statusMessage[ApiRoute.HOOK_ANALYZE][HookAnalyzeResult.ANALYZE_TEXT],
      });
    }
    
    switch (paramType) {
      case 'eoa':
        castText = `Here's some data about this External Owned Account (EOA):`;
        break;
      case 'contract':
        castText = `Here's some data about this Contract Address:`;
        break;
      case 'tx':
        castText = `Here's some data about this Transaction:`;
        break;
      case 'ens':
        castText = `Here's some data about this ENS name:`;
        break;
      default:
        break;
    }
        
    const castReply = await neynarClient.publishCast(
      process.env.SIGNER_UUID!,
      castText,
      {
        embeds: [
          {
            url: `${process.env.APP_URL}/api/frame-analyze/${network}/${paramType}/${param}`,
          },
        ],
      }
    );
    if (castReply.hash) {
      return c.json({
        message:
          statusMessage[ApiRoute.HOOK_ANALYZE][HookAnalyzeResult.CAST_SUCCESS],
      });
    } else {
      return c.json({
        message:
          statusMessage[ApiRoute.HOOK_ANALYZE][HookAnalyzeResult.CAST_ERROR],
      });
    }
  } catch (e) {
    return c.json({
      message:
        statusMessage[ApiRoute.HOOK_ANALYZE][HookAnalyzeResult.UNEXPECTED_ERROR],
    });
  }
});

app.frame(
  '/scan/:network/:paramType/:parameter',
  neynarMiddleware,
  async (c: FrameContext) => {
    const { buttonValue, status, req } = c;
    let ethAddresses: string[] = [];
    let network = req.param('network');
    let paramType = req.param('paramType');
    let parameter = req.param('parameter');
    let networkId = getNetworkId(network!);
    let frameText = '';
    let dynamicIntents: any[] = [];

    // Get the channel access rules
    if (
      status == 'initial' ||
      (status == 'response' && buttonValue == 'done')
    ) {
      frameText = `Verify some details.`;
      dynamicIntents = [<Button value='verify'>go</Button>];
    } else if (status == 'response') {
      const payload = await req.json();
      if (process.env.NODE_ENV === 'production') {
        const frameActionResponse: ValidateFrameActionResponse =
          await neynarClient.validateFrameAction(
            payload.trustedData.messageBytes
          );
        if (frameActionResponse.valid) {
          ethAddresses =
            frameActionResponse.action.interactor.verified_addresses
              .eth_addresses;
          console.log(
            statusMessage[ApiRoute.FRAME_ANALYZE][
              FrameAnalyzeResult.FRAME_ACTION_VALID
            ]
          );
        } else {
          console.log(
            statusMessage[ApiRoute.FRAME_ANALYZE][
              FrameAnalyzeResult.FRAME_ACTION_INVALID
            ]
          );
        }
      } else {
        // For local development only
        ethAddresses = [process.env.APP_TEST_ADDRESS!];
      }
         
      if (buttonValue == 'verify') {
        let tokenId: number | null = null;
        let userAddress: string | null = null;
        let balance: number | null = 0;
        let result: QueryResult | null = null;
        let paramAddress: string | null = null;

        switch (paramType) {
          case 'eoa':
            balance = await getBalance(parameter!, networkId!);
            result = await getQueryResults('690032', parameter!);
            frameText = `Its balance is ${balance} ETH, it has ${result?.txCount} txs, and the last one was ${result?.lastTxTimestamp}`;
            break;
          case 'contract':
            result = await getQueryResults('690033', parameter!);
            frameText = `This is an ${result?.isErc20 ? 'ERC20' : result?.isErc721 ? 'ERC721' : 'Custom'} contract. It has ${result?.txCount} transactions, and was deployed from ${result?.fromAddress} at ${result?.blockTimestamp}.`;
            break;
          case 'tx':
            result = await getQueryResults('690035', parameter!);
            frameText = `This transaction with hash ${result?.hash} was an interaction from ${result?.fromAddress} to ${result?.toAddress} that used ${result?.gas} gas and transferred ${result?.value} wei. It was mined at ${result?.blockTimestamp}.`;
            break;
          case 'ens':
            paramAddress = await getEnsAddress(parameter!);
            balance = await getBalance(paramAddress!, networkId!);
            result = await getQueryResults('690032', paramAddress!);
            frameText = `The balance of this ENS is ${balance}, it has ${result?.txCount} transactions, and the last one was ${result?.lastTxTimestamp}`;
            break;
          default:
            break;
        }

        dynamicIntents = [
          <Button value="done">done</Button>,
        ];
        
      } else {
        frameText = `...`;
        dynamicIntents = [<Button value="verify">complete</Button>];
      }
      
    }
    return c.res({
      title: 'LookUp - Analyzer',
      image: `/img/${network}/${paramType}/${parameter}/${frameText}`,
      intents: dynamicIntents,
    });
  }
);

const isAnalyzeCast = async (command: string, param: string, network: string): Promise<AnalysisResult> => {

  if (command !== '@lookup' || !param || !network) {
    return { valid: false, paramType: 'invalid' };
  }

  const supportedNetworks = ['base', 'optimism', 'arbitrum'];
  if (!supportedNetworks.includes(network)) {
    return { valid: false, paramType: 'invalid' };
  }

  try {
    if (param.endsWith('.eth')) {
      return { valid: false, paramType: 'ens' };
    } else {
      if (param.startsWith('0x')) {
        if (param.length === 66) {
          return { valid: false, paramType: 'tx' };
        } else if (isAddress(param)) {
          const code = await getEthCode(param, network);
          return { 
            valid: code !== '0x', 
            paramType: code === '0x' ? 'eoa' : 'contract' 
          };
        }
      }
    }

    return { valid: false, paramType: 'invalid' };

  } catch (error) {
    console.error("Error identifying param type:", error);
    return { valid: false, paramType: 'invalid' };
  }
};

app.image('/img/:network/:type/:param/:description', (c) => {
  const network = c.req.param('network');
  const type = c.req.param('type');
  const param = c.req.param('param');
  const description = c.req.param('description');
  return c.res({
    headers: {
      'Cache-Control': 'public, max-age=0',
    },
    image: 
    <Box grow flexDirection="row" gap="1" background="border">
      <Box flex="1" background="box" />
      <Box flex="10" background="box" flexDirection="column" height="100%" alignVertical="center" gap="1" backgroundColor="border">
        <Box flex="1" background="box" />
        <Box flex="10" background="box" flexDirection="column" alignItems="center" gap="1">
          <Box flex="2" alignVertical="center" alignHorizontal="center">
            <Heading>
              <Text size="18">@LookUp Analyzer</Text>
            </Heading>
          </Box>
          <Box flex="10" background="box" alignItems="center" flexDirection="column" gap="1">
            <VStack gap="1" marginLeft="10" marginRight="10">
              <Text size="14" align="left">Param: {param}</Text>
              <Text size="14" align="left">Type: {type}</Text>
              <Spacer size="24" />
              <Text size="14" align="left">{description}</Text>
            </VStack>
          </Box>
        </Box>
        <Box flex="1" background="box" />
      </Box>
      <Box flex="4" background="box" flexDirection="column" height="100%" alignVertical="center" gap="1" backgroundColor="border">
        <Box flex="1" background="box" />
        <Box flex="10" backgroundColor={`${network == "base" ? "base" : network === "optimism" ? "optimism" : "arbitrum"}`} />
        <Box flex="1" background="box" />
      </Box>
      <Box flex="1" background="box" />
    </Box>
  }
    
  )
})

devtools(app, { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
