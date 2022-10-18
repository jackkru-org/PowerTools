import { MouseEventHandler } from 'react';

export type GetChainResultType = {
  address: string;
  chain: number;
  chain_nodes: object;
  ok: boolean;
  result: 'found' | 'other_chain';
  txtaddress: string;
};

export type LoginToWalletSagaInput = {
  address?: string;
  wif?: string;
};

export type ExportAccountInputType = {
  password: string;
  hint?: string;
};

export type ImportAccountInputType = {
  accountFile: File;
  password: string;
};

export type AccountActionType = {
  title: string;
  action: MouseEventHandler<HTMLDivElement>;
  Icon: any;
};
