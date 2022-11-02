import React from 'react';
import {
  CardLink,
  DeepPageTemplate,
  Divider,
  FullScreenLoader,
} from 'common';
import {
  BuySvg,
  FaucetSvg,
  LogoIcon,
  SendSvg,
} from 'common/icons';
import { InView } from 'react-intersection-observer';
import { connect, ConnectedProps } from 'react-redux';
import { RootState } from '../../application/store';
import { loadTransactionsTrigger } from '../slices/walletSlice';
import { checkIfLoading } from '../../network/selectors';
import { getWalletAmount } from '../selectors/walletSelectors';
import Transaction from './Transaction';
import { getGroupedWalletTransactions } from '../selectors/transactionsSelectors';
import styles from './MyAssets.module.scss';
import { TransactionType } from '../slices/transactionsSlice';
import { setShowUnderConstruction } from '../../application/slice/applicationSlice';

const connector = connect(
  (state: RootState) => ({
    amount: getWalletAmount(state),
    loading: checkIfLoading(state, loadTransactionsTrigger.type),
    transactions: getGroupedWalletTransactions(state),
  }),
  {
    loadTransactionsTrigger,
    setShowUnderConstruction,
  },
);

type MyAssetsProps = ConnectedProps<typeof connector>;

class MyAssets extends React.PureComponent<MyAssetsProps> {
  componentDidMount() {
    this.props.loadTransactionsTrigger();
  }

  handleChangeView = (inView: boolean) => {
    if (inView) {
      this.props.loadTransactionsTrigger();
    }
  };

  renderTransactionsList = ([date, transactions]: [date: string, transactions: TransactionType[]]) => (
    <li key={date}>
      <p className={styles.date}>{date}</p>
      <ul className={styles.transactionsList}>
        {transactions.map((trx) => (
          <li key={trx.id}>
            <Transaction trx={trx} />
          </li>
        ))}
      </ul>
    </li>
  );

  handleShowUnderConstruction = (event: React.MouseEvent) => {
    event.preventDefault();
    this.props.setShowUnderConstruction(true);
  };

  render() {
    const { amount, loading, transactions } = this.props;

    if (loading && !Object.keys(transactions).length) {
      return <FullScreenLoader />;
    }

    return (
      <DeepPageTemplate topBarTitle="My Assets" backUrl="/">
        <div className={styles.panel}>
          <div className={styles.info}>
            <p className={styles.title}>
              {'Total balance'}
            </p>
            <p className={styles.balance}>
              <LogoIcon className={styles.icon} />
              {amount}
            </p>
          </div>
          <div className={styles.linksGroup}>
            <CardLink label="Faucet" isAnchor to="https://faucet.thepower.io/" target="_blank" rel="noreferrer">
              <FaucetSvg />
            </CardLink>
            <CardLink to="/send" label="Send">
              <SendSvg />
            </CardLink>
            <CardLink onClick={this.handleShowUnderConstruction} to="/buy" label="Buy">
              <BuySvg />
            </CardLink>
          </div>
        </div>
        <Divider />
        <div className={styles.transactions}>
          <p className={styles.pageTitle}>
            {'Transactions'}
          </p>
          <p className={styles.historyTitle}>
            {'History'}
          </p>
          <Divider />
          <ul className={styles.groupByDates}>
            {Object.entries(transactions).map(this.renderTransactionsList)}
          </ul>
        </div>
        <InView onChange={this.handleChangeView}>
          <div />
        </InView>
      </DeepPageTemplate>
    );
  }
}

export default connector(MyAssets);
