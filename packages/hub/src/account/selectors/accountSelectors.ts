import { RootState } from '../../application/store';

export const getWalletData = (state: RootState) => state.account.walletData;
export const getWalletAddress = (state: RootState) => state.account.walletData.address;
