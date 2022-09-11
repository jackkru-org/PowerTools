import { AddressApi } from './address';
import { NetworkApi } from './network';
import { TransactionsApi } from './transactions';
import { CryptoApi } from './crypto';
import { correctAmount, correctAmountsObject } from '../utils/numbers';
import { Maybe } from '../typings';


export class WalletApi {
  private networkApi;

  private blocksPerPage = 8;

  constructor(chain: number) {
    this.networkApi = new NetworkApi(chain);
    this.networkApi.bootstrap();
  }

  private prettifyTx(inputTx: any, block: any) {
    const tx = Object.assign({}, inputTx);
    if (tx.ver >= 2) {
      tx.timestamp = tx.t;

      if (tx.payload) {
        const payment =
          tx.payload.find((elem: any) => elem.purpose === 'transfer') ||
          tx.payload.find((elem: any) => elem.purpose === 'srcfee');
        if (payment) {
          tx.cur = payment.cur;
          tx.amount = correctAmount(payment.amount, tx.cur);
        }
      }
      if (!tx.cur || !tx.amount) {
        tx.cur = '---';
        tx.amount = '0';
      }

      tx.sig = Array.isArray(tx.sig)
        ? tx.sig.reduce(
          (acc: any, item: any) =>
            Object.assign(acc, { [item.extra.pubkey]: item.signature }),
          {},
        )
        : [];
    } else {
      //version 1 - deprecated
      if (tx.amount) {
        tx.amount = correctAmount(tx.amount, tx.cur);
      }
    }

    //Common conversions
    if (tx.address) {
      tx.address = AddressApi.hexToTextAddress(tx.address);
    }

    if (tx.to) {
      tx.to = AddressApi.hexToTextAddress(tx.to);
    }

    if (tx.from) {
      tx.from = AddressApi.hexToTextAddress(tx.from);
    }

    tx.inBlock = block.hash;
    tx.blockNumber = block.header.height;

    return tx;
  }

  public async createNew(
    chain: string,
    seedPhrase: string,
    referrer: string = '',
    wait: boolean = false,
  ) {
    const nodes = await this.networkApi.getChainNodes(chain, chain);

    if (Object.keys(nodes.chain_nodes).length === 0) {
      throw 'Can not access chain';
    }

    const { settings } = await this.networkApi.getNodeSettings();

    const keyPair = await CryptoApi.generateKeyPairFromSeedPhrase(
      seedPhrase,
      settings.current.allocblock.block,
      settings.current.allocblock.group,
    );

    const wif = keyPair.toWIF();

    const transmission = await TransactionsApi.composeRegisterTX(
      +chain,
      wif,
      referrer,
    );

    let { txid } = await this.networkApi.createTransaction({ tx: transmission } );

    if (wait) {
      let walletAddress = '';
      let count = 0;
      while (walletAddress === '') {
        if (count > 60) {
          throw 'Timeout';
        }
        count++;
        const { res: status } = await this.networkApi.getTransactionStatus(txid);
        if (status?.error) {
          throw status?.error;
        }
        if (status?.ok) {
          walletAddress = status.res;
          break;
        }
      }

      return { privateKey: wif, address: walletAddress };
    }

    return { privateKey: wif, txid };
  }

  public async makeNewTx(
    wif: string,
    from: string,
    to: string,
    token: string,
    inputAmount: number,
    message: string,
    seq: string,
    callback: any,
  ) {
    const amount = correctAmount(inputAmount, token, false);
    const feeSettings = this.networkApi.getFeeSettings();

    const transmission = TransactionsApi.composeSimpleTransferTX(
      feeSettings,
      wif,
      from,
      to,
      token,
      amount,
      message,
      seq,
    );

    return this.networkApi.sendPreparedTX(transmission, callback);
  }

  public async getBlock(inputHash: string, address: Maybe<string> = null) {
    let block: any;
    let hash = inputHash;
    if (address !== null) {
      hash = hash + '?addr=' + address;
    }
    if (hash !== 'last' && localStorage.getItem(hash)) {
      block = JSON.parse(localStorage.getItem(hash)!);
    } else {
      block = await this.networkApi.getBlock(hash);

      block = block.block;
      // Correct the sums and addresses: we bring the addresses to text form, and the sums to the required number of characters after the decimal point
      block.bals = Object.keys(block.bals).reduce(
        (acc, key) =>
          Object.assign(acc, {
            [AddressApi.hexToTextAddress(key)]: {
              ...block.bals[key],
              amount: correctAmountsObject(block.bals[key].amount),
            },
          }),
        {},
      );

      block.txs = Object.keys(block.txs).reduce(
        (acc, key) =>
          Object.assign(acc, { [key]: this.prettifyTx(block.txs[key], block) }),
        {},
      );

      //Do not cache last block
      if (hash !== 'last' && block.child) {
        //caching disabled altogether
        //localStorage.setItem(hash, JSON.stringify(block))
      }
    }

    return block;
  }

  public async loadBalance(address: string) {
    let walletData = await this.networkApi.getWallet(address);

    return {
      ...walletData.info,
      amount: correctAmountsObject(walletData.info.amount),
    };
  }

  public async getRawTransactionsHistory(inputLastBlock: string, address: string, perPage: number = this.blocksPerPage) {
    let transactionHistory = new Map(),
      loadedBlocks = 0,
      lastBlock = inputLastBlock;

    while (lastBlock !== '0000000000000000' && loadedBlocks < perPage) {
      const block = await this.getBlock(lastBlock, address);
      loadedBlocks++;
      if (!Object.keys(block.txs).length) {
        //TODO remove when backend is fixed and tx id for wallet creation is visible
        if (!block.bals[address].lastblk) {
          transactionHistory.set('dummy_tx_id', {
            incoming: true,
            inBlock: lastBlock,
            blockNumber: block.header.height,
            address: address,
            addressAllocationBlock: true,
          });
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        Object.keys(block.txs).forEach((key) => {
          if (
            block.txs[key].to === address ||
            block.txs[key].from === address
          ) {
            transactionHistory.set(key, block.txs[key]);
          } else if (block.txs[key].address === address) {
            transactionHistory.set(key, {
              incoming: true,
              inBlock: lastBlock,
              blockNumber: block.header.height,
              address: address,
              addressAllocationBlock: true,
            });
          }
        });
      }

      lastBlock = block.bals[address].lastblk
        ? block.bals[address].lastblk
        : '0000000000000000';
    }

    if (lastBlock !== '0000000000000000') {
      transactionHistory.set('needMore', lastBlock);
    }

    return transactionHistory;
  }

  public getExportData(wif: string, address: string, password: string, hint: string = '') {
    return (
      JSON.stringify({ version: 2, hint }) +
      '\n' +
      CryptoApi.encryptWalletDataToPEM(wif, address, password) +
      '\n'
    );
  }

  public async parseExportData(data: string, password: string) {
    const firstLine = data.split('\n')[0];

    try {
      JSON.parse(firstLine);
    } catch (e) {
      let offset = 0;
      if (data.charCodeAt(0) < 128 || data.charCodeAt(0) > 191) {
        offset = 1;
      }

      let wif = data.slice(8 + offset),
        binaryAddress = new Uint8Array(8),
        textAddress;
      for (let i = 0; i <= 7; i++) {
        binaryAddress[i] = data.charCodeAt(i + offset);
      }
      textAddress = AddressApi.encodeAddress(binaryAddress).txt;

      return { wif: wif, address: textAddress };
    }

    return CryptoApi.decryptWalletData(data, password);
  }

  public calculateFee(
    feeSettings: any,
    from: string,
    to: string,
    token: string,
    amount: number,
    message: string,
    seq: string,
  ) {
    const rawFee = TransactionsApi.calculateFee(
      feeSettings,
      from,
      to,
      token,
      correctAmount(amount, token, false),
      message,
      seq,
    );
    return rawFee
      ? [rawFee[1], correctAmount(rawFee[2], rawFee[1])]
      : [];
  }
}
