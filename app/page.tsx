'use client'

import { postComposerCreateCastActionMessage } from 'frog/next'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from 'react'
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import Image from 'next/image'

const networks = [
  {
    value: "base",
    label: "Base",
  },
  {
    value: "optimism",
    label: "Optimism",
  },
  {
    value: "arbitrum",
    label: "Arbitrum",
  }
];

const paramTypes = [
  {
    value: "eoa",
    label: "EOA",
  },
  {
    value: "contract",
    label: "Contract Address",
  },
  {
    value: "ens",
    label: "ENS Name",
  },
  {
    value: "tx",
    label: "Transaction Hash",
  }
];

export default function Home() { 
  
  const [networkOpen, setNetworkOpen] = useState(false)
  const [networkValue, setNetworkValue] = useState("")
  
  const [paramTypeOpen, setParamTypeOpen] = useState(false)
  const [paramTypevalue, setParamTypeValue] = useState("")
  
  const [param, setParam] = useState("");
  
  let frameText = '';

switch (paramTypevalue) {
    case 'eoa':
        frameText = `The details of the EOA ${param} on ${networkValue} network are:`;
        break;
    case 'contract':
        frameText = `The details of the contract ${param} on ${networkValue} network are:`;
        break;
    case 'tx':
        frameText = `The details of the transaction ${param} on ${networkValue} network are:`;
        break;
    case 'ens':
        frameText = `The details of the ENS ${param} on ${networkValue} network are:`;
        break;
    default:
        frameText = 'Invalid parameter type.'; // Handle unexpected cases
        break;
}
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div>
        <div className="flex flex-col items-center m-3">
          <Image src="/logo-light.svg" alt="LookUp logo" width={100} height={100} />          
        </div>
        <Card className="w-screen max-w-md">
          <CardHeader className='flex flex-col items-center'>
            <CardTitle className="text-2xl">LookUp Analyzer</CardTitle>
            <CardDescription>Lookup an EOA, contract, tx or ENS on any EVM network. This project works as a Farcaster Composer Action.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Network</Label>
              <Popover open={networkOpen} onOpenChange={setNetworkOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={networkOpen}
                    className="w-full justify-between"
                  >
                    {networkValue
                      ? networks.find((network) => network.value === networkValue)?.label
                      : "Select Network..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandList>
                      <CommandEmpty>No network found.</CommandEmpty>
                      <CommandGroup>
                        {networks.map((network) => (
                          <CommandItem
                            key={network.value}
                            value={network.value}
                            onSelect={(currentValue) => {
                              setNetworkValue(currentValue === networkValue ? "" : currentValue)
                              setNetworkOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                networkValue === network.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {network.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Param Type</Label>
              <Popover open={paramTypeOpen} onOpenChange={setParamTypeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={paramTypeOpen}
                    className="w-full justify-between"
                  >
                    {paramTypevalue
                      ? paramTypes.find((paramType) => paramType.value === paramTypevalue)?.label
                      : "Select Param Type..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandList>
                      <CommandEmpty>No param type found.</CommandEmpty>
                      <CommandGroup>
                        {paramTypes.map((paramType) => (
                          <CommandItem
                            key={paramType.value}
                            value={paramType.value}
                            onSelect={(currentValue) => {
                              setParamTypeValue(currentValue === paramTypevalue ? "" : currentValue)
                              setParamTypeOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                paramTypevalue === paramType.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {paramType.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="param">Parameter</Label>
              <Input
                id="param"
                value={param} 
                onChange={(event) => setParam(event.target.value)}
                required />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => {
              postComposerCreateCastActionMessage({
                text: `${frameText}`,
                embeds: [`${process.env.NEXT_PUBLIC_APP_URL}/api/scan/${networkValue}/${paramTypevalue}/${param}`]
              })}
            }>LookUp</Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}