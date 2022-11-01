import { RootState } from '../store';

export const getNetworkApi = (state: RootState) => state.applicationData.networkApi;
export const getWalletApi = (state: RootState) => state.applicationData.walletApi;
