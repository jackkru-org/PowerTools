import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import styles from '../../Registration.module.scss';
import {
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import { Tabs, OutlinedInput } from '../../../../common'
import {
  setCreatingCurrentShard,
  generateSeedPhrase,
  setCreatingStep,
  setSeedPhrase,
  createWallet,
  setCurrentRegisterCreateAccountTab,
} from '../../../slice/registrationSlice';
import { CreateAccountStepsEnum, LoginRegisterAccountTabs, LoginRegisterAccountTabsLabels } from '../../../typings/registrationTypes';
import { getCurrentCreatingStep, getCurrentShardSelector, getGeneratedSeedPhrase } from '../../../selectors/registrationSelectors';
import { ApplicationState } from '../../../../application';
import { SelectChangeEvent } from '@mui/material/Select/SelectInput';
import { RegistrationBackground } from '../../common/RegistrationBackground';
import classnames from 'classnames';
import { RegistrationStatement } from '../../common/RegistrationStatement';

const mapStateToProps = (state: ApplicationState) => ({
  currentShard: getCurrentShardSelector(state),
  creatingStep: getCurrentCreatingStep(state),
  generatedSeedPhrase: getGeneratedSeedPhrase(state),
});

const mapDispatchToProps = {
  setCreatingCurrentShard,
  generateSeedPhrase,
  setCreatingStep,
  setSeedPhrase,
  createWallet,
  setCurrentRegisterCreateAccountTab,
};

const connector = connect(mapStateToProps, mapDispatchToProps);
type CreateNewAccountProps = ConnectedProps<typeof connector> & {
  onChangeTab: (_event: React.SyntheticEvent, value: LoginRegisterAccountTabs) => void;
  tab: LoginRegisterAccountTabs;
};

interface CreateNewAccountState {
  userSeedPhrase: string;
  confirmedSeedPhrase: string;
  seedsNotEqual: boolean;
  password: string;
  confirmedPassword: string;
  passwordsNotEqual: boolean;
}

class CreateNewAccountComponent extends React.PureComponent<CreateNewAccountProps, CreateNewAccountState> {
  private selectMenuProps = {
    className: styles.loginRegisterAccountCreateSelectMenu,
  };

  constructor(props: CreateNewAccountProps) {
    super(props);
    this.state = {
      userSeedPhrase: '',
      confirmedSeedPhrase: '',
      seedsNotEqual: false,
      password: '',
      confirmedPassword: '',
      passwordsNotEqual: false,
    };
  }

  componentDidMount() {
    this.props.setCurrentRegisterCreateAccountTab(LoginRegisterAccountTabs.create);
  }

  onSelectShard = (event: SelectChangeEvent<number>) => {
    this.props.setCreatingCurrentShard(event.target.value as number);
  };

  submitForm = () => {
    const {
      creatingStep,
      generateSeedPhrase,
      setSeedPhrase,
      generatedSeedPhrase,
      setCreatingStep,
      createWallet,
    } = this.props;
    const {
      userSeedPhrase,
      confirmedSeedPhrase,
      password,
      confirmedPassword,
    } = this.state;

    switch (creatingStep) {
      case CreateAccountStepsEnum.selectSubChain: {
        generateSeedPhrase();
        return;
      }
      case CreateAccountStepsEnum.setSeedPhrase: {
        setSeedPhrase({
          seedPhrase: (userSeedPhrase || generatedSeedPhrase)!,
          nextStep: CreateAccountStepsEnum.confirmSeedPhrase,
        });
        return;
      }
      case CreateAccountStepsEnum.confirmSeedPhrase: {
        const seedsNotEqual = !this.compareSeedPhrase(generatedSeedPhrase!, confirmedSeedPhrase);
        if (seedsNotEqual) {
          this.setState({
            seedsNotEqual,
          });
          return;
        }
        setCreatingStep(CreateAccountStepsEnum.encryptPrivateKey);
        return;
      }
      case CreateAccountStepsEnum.encryptPrivateKey: {
        const passwordsNotEqual = !this.comparePassword(password, confirmedPassword);

        if (passwordsNotEqual) {
          this.setState({
            passwordsNotEqual: true,
          });
          return;
        }

        createWallet(password);
      }
    }
  };


  handleBackClick = () => {
    const { creatingStep, setCreatingStep } = this.props;

    switch (creatingStep) {
      case CreateAccountStepsEnum.setSeedPhrase : {
        setCreatingStep(CreateAccountStepsEnum.selectSubChain);
        return;
      }
      case CreateAccountStepsEnum.confirmSeedPhrase: {
        setCreatingStep(CreateAccountStepsEnum.setSeedPhrase);
        this.setState({
          seedsNotEqual: false,
          confirmedSeedPhrase: '',
        });
        return;
      }
      case CreateAccountStepsEnum.encryptPrivateKey : {
        setCreatingStep(CreateAccountStepsEnum.confirmSeedPhrase);
        this.setState({
          password: '',
          confirmedPassword: '',
          passwordsNotEqual: false,
        });
        return;
      }
      default:
        return;
    }
  };

  renderContent = () => {
    const { creatingStep } = this.props;
    switch (creatingStep) {
      case CreateAccountStepsEnum.selectSubChain:
        return this.renderSelectSubChain();
      case CreateAccountStepsEnum.setSeedPhrase:
        return this.renderSetSeedPhrase();
      case CreateAccountStepsEnum.confirmSeedPhrase:
        return this.renderConfirmSeedPhrase();
      case CreateAccountStepsEnum.encryptPrivateKey:
        return this.renderEncryptPrivateKey();
      default:
        return null;
    }
  };

  renderSelectSubChain = () => {
    const { currentShard, tab, onChangeTab } = this.props;

    return <RegistrationBackground>
      <div className={styles.loginRegisterAccountTitle}>
        {'Create, login or import an account'}
      </div>
      <div className={styles.loginRegisterAccountHolder}>
        <Tabs
          tabs={LoginRegisterAccountTabs}
          tabsLabels={LoginRegisterAccountTabsLabels}
          value={tab}
          onChange={onChangeTab}
        />
        <div className={styles.selectShardHolder}>
          <div className={styles.loginRegisterAccountCreateDesc}>
            {'The wallet is still in alpha-testing phase. \nWallet creation may take a couple of minutes'}
          </div>
          <div>{'Selected shard:'}</div>
          <Select
            value={currentShard!}
            className={styles.loginRegisterAccountCreateSelect}
            fullWidth
            MenuProps={this.selectMenuProps}
            onChange={this.onSelectShard}
          >
            <MenuItem value={104}>{104}</MenuItem>
            <MenuItem value={103}>{103}</MenuItem>
          </Select>
        </div>
      </div>
    </RegistrationBackground>;
  };

  onChangeUserSeedPhrase = (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    this.setState({
      userSeedPhrase: event.target.value,
    });
  };

  onChangeConfirmedSeedPhrase = (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    this.setState({
      confirmedSeedPhrase: event.target.value,
      seedsNotEqual: false,
    });
  };

  onChangePassword = (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    this.setState({
      password: event.target.value,
      passwordsNotEqual: false,
    });
  };

  onChangeConfirmedPassword = (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    this.setState({
      confirmedPassword: event.target.value,
      passwordsNotEqual: false,
    });
  };

  renderSetSeedPhrase = () => {
    const { generatedSeedPhrase } = this.props;
    const { userSeedPhrase } = this.state;

    return <RegistrationBackground>
      <div className={styles.loginRegisterAccountTitle}>
        {'Remember'}
      </div>
      <RegistrationStatement description={'Enter a seed phrase or use the one we provide'}/>
      <RegistrationStatement description={'If you specify your own seed phrase it is up to you to make sure it is valid'}/>
      <RegistrationStatement description={'Write down your seed phrase and store is somewhere safe'}/>
      <RegistrationStatement description={'Seed phrase is the only way to restore your private key'}/>
      <div className={styles.seedPhraseTitle}>
        {'Seed phrase'}
      </div>
      <OutlinedInput
        placeholder={generatedSeedPhrase!}
        className={styles.loginTextArea}
        multiline
        value={userSeedPhrase}
        onChange={this.onChangeUserSeedPhrase}
      />
    </RegistrationBackground>
  };

  compareSeedPhrase = (generatedSeed: string, confirmedSeed: string) => (
    generatedSeed.trim().replace(/ +(?= )/g,'') === confirmedSeed.trim().replace(/ +(?= )/g,'')
  );

  comparePassword = (password: string, passwordConfirm: string) => {
    return password !== '' && password === passwordConfirm;
  };

  renderConfirmSeedPhrase = () => {
    const { generatedSeedPhrase } = this.props;
    const { confirmedSeedPhrase, seedsNotEqual } = this.state;

    return <div className={styles.confirmSeedPhraseHolder}>
      <div className={styles.confirmSeedPhraseTitle}>
        {'Repeat seed phrase'}
      </div>
      <OutlinedInput
        placeholder={generatedSeedPhrase!}
        className={styles.loginTextArea}
        multiline
        value={confirmedSeedPhrase}
        onChange={this.onChangeConfirmedSeedPhrase}
        error={seedsNotEqual}
        errorMessage={'Oh:( the seed phrase is incorrect, please try again'}
      />
    </div>
  };

  renderEncryptPrivateKey = () => {
    const { password, confirmedPassword, passwordsNotEqual } = this.state;

    return <RegistrationBackground>
      <div className={styles.loginRegisterAccountTitle}>
        {'Enter password to encrypt your private key'}
      </div>
      <div className={styles.encryptKeyHolder}>
        <OutlinedInput
          placeholder={'Password'}
          className={styles.passwordInput}
          value={password}
          onChange={this.onChangePassword}
          type={'password'}
        />
        <OutlinedInput
          placeholder={'Repeat password'}
          className={styles.passwordInput}
          value={confirmedPassword}
          onChange={this.onChangeConfirmedPassword}
          type={'password'}
          error={passwordsNotEqual}
          errorMessage={"oops, passwords didn't match, try again"}
        />
      </div>
    </RegistrationBackground>;
  };

  getSubmitButtonDisabled = () => {
    const { creatingStep, currentShard } = this.props;
    const {
      confirmedSeedPhrase,
      seedsNotEqual,
      password,
      confirmedPassword,
      passwordsNotEqual,
    } = this.state;

    switch (creatingStep) {
      case CreateAccountStepsEnum.selectSubChain:
        return !currentShard;
      case CreateAccountStepsEnum.confirmSeedPhrase:
        return !confirmedSeedPhrase || seedsNotEqual;
      case CreateAccountStepsEnum.encryptPrivateKey:
        return !password || !confirmedPassword || passwordsNotEqual;
      default:
        return false;

    }
  };

  render() {
    const { creatingStep} = this.props;

    return <>
      {this.renderContent()}
      <div className={styles.registrationButtonsHolder}>
        {
          creatingStep !== CreateAccountStepsEnum.selectSubChain &&
          <Button
            className={classnames(styles.registrationNextButton, styles.registrationNextButton_outlined)}
            variant='outlined'
            size='large'
            onClick={this.handleBackClick}
          >
            <span className={styles.registrationNextButtonText}>
              {'Back'}
            </span>
          </Button>
        }
        <Button
          className={styles.registrationNextButton}
          variant='contained'
          size='large'
          onClick={this.submitForm}
          disabled={this.getSubmitButtonDisabled()}
        >
          {'Next'}
        </Button>
      </div>
    </>
  }
}

export const CreateNewAccount = connector(CreateNewAccountComponent);
