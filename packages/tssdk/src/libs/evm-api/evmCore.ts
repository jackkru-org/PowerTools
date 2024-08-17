import { Abi } from 'abitype';
import {
  encodeFunctionData,
  EncodeFunctionDataParameters,
  hexToBytes,
  DecodeFunctionResultReturnType,
} from 'viem/utils';

import {
  ContractFunctionArgs,
  ContractFunctionName,
} from 'viem/_types/types/contract';
import { AbiStateMutability } from 'viem';
import { NetworkApi, TransactionsApi } from '../index';

import { AccountKey, TxResponse } from '../../typings';

export class EvmContract {
  private network: NetworkApi;

  private address: string;

  constructor(network: NetworkApi, address: string) {
    this.network = network;
    this.address = address;
  }

  public async scGet<
    const TAbi extends Abi | readonly unknown[],
    TFunctionName extends ContractFunctionName<TAbi> | undefined = undefined,
    const TArgs extends ContractFunctionArgs<
    TAbi,
    AbiStateMutability,
    TFunctionName extends ContractFunctionName<TAbi>
      ? TFunctionName
      : ContractFunctionName<TAbi>
    > = ContractFunctionArgs<
    TAbi,
    AbiStateMutability,
    TFunctionName extends ContractFunctionName<TAbi>
      ? TFunctionName
      : ContractFunctionName<TAbi>
    >,
  >(parameters: EncodeFunctionDataParameters<TAbi, TFunctionName>) {
    const { args, abi, functionName } =
      parameters as EncodeFunctionDataParameters;

    return this.network.executeCall({ args, abi, functionName }, { address: this.address }) as DecodeFunctionResultReturnType<
    TAbi,
    TFunctionName,
    TArgs
    >;
  }

  public async scSet<
    const TAbi extends Abi | readonly unknown[],
    TFunctionName extends ContractFunctionName<TAbi> | undefined = undefined,
    const TArgs extends ContractFunctionArgs<
    TAbi,
    AbiStateMutability,
    TFunctionName extends ContractFunctionName<TAbi>
      ? TFunctionName
      : ContractFunctionName<TAbi>
    > = ContractFunctionArgs<
    TAbi,
    AbiStateMutability,
    TFunctionName extends ContractFunctionName<TAbi>
      ? TFunctionName
      : ContractFunctionName<TAbi>
    >,
  >(
    parameters: EncodeFunctionDataParameters<TAbi, TFunctionName>,
    {
      key,
      amount = 0,
      sponsor = '',
    }: {
      key: AccountKey;
      amount?: number;
      sponsor?: string;
    },
  ) {
    const {
      abi,
      functionName,
      args = [],
    } = parameters as EncodeFunctionDataParameters;

    const addressChain = await this.network.getAddressChain(key.address);
    const addressChainNumber = addressChain?.chain;

    if (this.network.getChain() !== addressChainNumber) {
      await this.network.changeChain(addressChainNumber);
    }

    const sequence = await this.network.getWalletSequence(key.address);
    const newSequence = BigInt(sequence + 1);

    const encodedFunction = encodeFunctionData({
      abi,
      functionName,
      args,
    });

    const data = hexToBytes(encodedFunction);
    const dataBuffer = Buffer.from(data);

    const tx = sponsor === '' ?
      TransactionsApi.composeSCMethodCallTX(
        {
          address: key.address,
          sc: this.address,
          toCall: ['0x0', [dataBuffer]],
          gasToken: '',
          gasValue: 0,
          wif: key.wif,
          seq: newSequence,
          amountToken: 'SK',
          amountValue: amount,
          feeSettings: this.network.feeSettings,
          gasSettings: this.network.gasSettings,
        },
      ) :
      TransactionsApi.composeSponsorSCMethodCallTX(
        {
          address: key.address,
          sc: this.address,
          toCall: ['0x0', [dataBuffer]],
          gasToken: '',
          gasValue: 0,
          wif: key.wif,
          seq: newSequence,
          amountToken: 'SK',
          amountValue: amount,
          feeSettings: this.network.feeSettings,
          gasSettings: this.network.gasSettings,
          sponsor,
        },
      );

    const res = await this.network.sendTxAndWaitForResponse(tx);

    return res as TxResponse<
    DecodeFunctionResultReturnType<TAbi, TFunctionName, TArgs>
    >;
  }
}
