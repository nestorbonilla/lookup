'use client'

import { postComposerCreateCastActionMessage } from 'frog/next'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from 'react'
import { cn } from "@/lib/utils"
import { Icons } from '@/components/icons'
import { isAddress } from 'viem'
import { getEthCode, getNetworkId } from '@/app/utis/chainbase/constants';

const networks = [
  {
    value: "ethereum",
    label: "Ethereum",
    icon: <Icons.ethereum className="h-14 w-14"/>,
  },
  {
    value: "base",
    label: "Base",
    icon: <Icons.base className="h-14 w-14"/>,
  },
  {
    value: "optimism",
    label: "Optimism",
    icon: <Icons.optimism className="h-14 w-14"/>,
  },
  {
    value: "arbitrum",
    label: "Arbitrum",
    icon: <Icons.arbitrumOne className="h-14 w-14"/>,
  }
];

export default function Home() {
  const [network, setNetwork] = useState("")
  const [paramType, setParamType] = useState("")
  const [param, setParam] = useState("");
  
  useEffect(() => {
    const identifyParamType = async () => {
      if (!network || !param) {
        setParamType('');
        return;
      }

      try {
        if (param.endsWith('.eth')) {
          setParamType('ens');
        } else if (param.startsWith('0x')) {
          if (param.length === 66) {
            setParamType('tx');
          } else if (isAddress(param)) {
            const chainbaseNetwork = getNetworkId(network);
            const code = await getEthCode(param, chainbaseNetwork);
            setParamType(code === '0x' ? 'eoa' : 'contract');
          } else {
            setParamType('');
          }
        } else {
          setParamType('');
        }
      } catch (error) {
        console.error("Error identifying param type:", error);
        setParamType('');
      }
    };

    identifyParamType();
  }, [param, network]);

  let frameText = '';
  switch (paramType) {
    case 'eoa':
      frameText = `The details of the EOA ${param} on ${network} network are:`;
      break;
    case 'contract':
      frameText = `The details of the contract ${param} on ${network} network are:`;
      break;
    case 'tx':
      frameText = `The details of the transaction ${param} on ${network} network are:`;
      break;
    case 'ens':
      frameText = `The details of the ENS ${param} on ${network} network are:`;
      break;
    default:
      frameText = 'Invalid parameter type.';
      break;
  }
  
  const getButtonText = (type: string) => {
    if (!type) return 'LookUp';
    
    switch (type.toLowerCase()) {
      case 'eoa':
      case 'ens':
        return `LookUp ${type.toUpperCase()}`;
      default:
        return `LookUp ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    }
  };
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div>
        <div className="flex flex-col items-center m-3">
          <Icons.logo className="h-28 w-28"/>
        </div>
        <Card className="w-screen max-w-md">
          <CardHeader className='flex flex-col items-center'>
            <CardTitle className="text-2xl">LookUp Analyzer</CardTitle>
            <CardDescription>Lookup an EOA, contract, tx or ENS on any EVM network. This project works as a Farcaster Composer Action.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="network">Network</Label>
              <div className="grid grid-cols-4 gap-2">
                {networks.map((currentNetwork) => (
                  <Button
                    key={currentNetwork.value}
                    variant="outline"
                    className={cn(
                      "p-2 w-20 h-20 flex items-center justify-center",
                      network === currentNetwork.value && "bg-gray-300"
                    )}
                    onClick={() => setNetwork(currentNetwork.value)}
                  >
                    {currentNetwork.icon}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="param">Parameter</Label>
              <Input
                id="param"
                value={param} 
                onChange={(event) => setParam(event.target.value)} 
                disabled={!network}
                required />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              disabled={!paramType || !network}
              onClick={() => {
                postComposerCreateCastActionMessage({
                  text: `${frameText}`,
                  embeds: [`${process.env.NEXT_PUBLIC_APP_URL}/api/scan/${network}/${paramType}/${param}`]
                })}
              }
            >
              {getButtonText(paramType)}
            </Button>
          </CardFooter>
        </Card>
        <div className="flex flex-col items-center mt-4 text-gray-500">
          <p className="text-sm italic mb-2">
            This product is intended to work as a Farcaster Action.
          </p>
          <Icons.farcaster className="h-8 w-8" />
        </div>
      </div>
    </main>
  )
}