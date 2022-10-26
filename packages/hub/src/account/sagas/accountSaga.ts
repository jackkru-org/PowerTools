import { call, put, select } from 'redux-saga/effects';
import { CryptoApi } from '@thepowereco/tssdk';
import fileSaver from 'file-saver';
import {
  FileReaderType, getFileData,
} from 'common';
import { push } from 'connected-react-router';
import { toast } from 'react-toastify';
import {
  clearAccountData,
  setWalletData,
} from '../slice/accountSlice';
import { getWalletData } from '../selectors/accountSelectors';
import {
  ExportAccountInputType,
  GetChainResultType,
  LoginToWalletSagaInput,
  ImportAccountInputType,
} from '../typings/accountTypings';
import { clearApplicationStorage, setKeyToApplicationStorage } from '../../application/utils/localStorageUtils';
import { NetworkAPI, WalletAPI } from '../../application/utils/applicationUtils';
import { RoutesEnum } from '../../application/typings/routes';

export function* loginToWalletSaga({ payload }: { payload?: LoginToWalletSagaInput } = {}) {
  const { address, wif } = payload!;

  try {
    let subChain: GetChainResultType;
    let currentChain = 8;
    let prevChain = null;

    do {
      subChain = yield NetworkAPI.getAddressChain(address!);

      // Switch bootstrap when transitioning from testnet to 101-th chain
      if (subChain.chain === 101 && currentChain !== 101) {
        subChain = yield NetworkAPI.getAddressChain(address!);
      }

      if (subChain.result === 'other_chain') {
        if (prevChain === subChain.chain) {
          toast.error('Portation in progress. Try again in a few minutes.');
          return;
        }

        prevChain = currentChain;
        currentChain = subChain.chain;
      }
    } while (subChain.result !== 'found');

    yield setKeyToApplicationStorage('address', address);
    yield setKeyToApplicationStorage('wif', wif);
    yield put(setWalletData({
      address: payload?.address!,
      wif: payload?.wif!,
      logged: true,
    }));
  } catch (e) {
    toast.error('Login error');
  }
}

export function* importAccountFromFileSaga({ payload }: { payload:ImportAccountInputType }) {
  const { accountFile, password } = payload;

  try {
    const data: string = yield call(getFileData, accountFile, FileReaderType.binary);
    const walletData: LoginToWalletSagaInput = yield WalletAPI.parseExportData(data, password);
    const wif: string = yield CryptoApi.encryptWif(walletData.wif!, password);

    yield* loginToWalletSaga({ payload: { address: walletData.address, wif } });
    yield put(push(RoutesEnum.root));
  } catch (e) {
    toast.error('Import account error. Try again in a few minutes.');
  }
}

export function* exportAccountSaga({ payload }: { payload: ExportAccountInputType }) {
  const { wif, address } = yield select(getWalletData);
  const { password, hint } = payload;

  try {
    const decryptedWif: string = yield CryptoApi.decryptWif(wif, password);
    const exportedData: string = yield WalletAPI.getExportData(decryptedWif, address, password, hint);

    const blob: Blob = yield new Blob([exportedData], { type: 'octet-stream' });
    yield fileSaver.saveAs(blob, 'power_wallet.pem', true);

    yield* loginToWalletSaga({ payload: { address, wif } });
    yield put(push(RoutesEnum.root));
  } catch (e) {
    toast.error('Export account error. Try again in a few minutes.');
  }
}

export function* resetAccountSaga({ payload }: { payload: string }) {
  const { wif } = yield select(getWalletData);
  try {
    yield CryptoApi.decryptWif(wif, payload);

    yield clearApplicationStorage();
    yield put(clearAccountData());
    yield put(push(RoutesEnum.signup));
  } catch (e) {
    toast.error('Reset account error. Try again in a few minutes.');
  }
}
