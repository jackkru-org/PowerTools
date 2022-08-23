import React from 'react';
import { Button } from '@mui/material';
import classnames from 'classnames';
import { RegistrationBackground } from '../common/RegistrationBackground';
import { RegistrationStatement } from '../common/RegistrationStatement';
import { WizardComponentProps } from '../../../common';
import styles from '../Registration.module.scss';

interface BeAwareProps extends WizardComponentProps {}

export const BeAware: React.FC<BeAwareProps> = (props: BeAwareProps) => {
  return <>
    <RegistrationBackground>
      <div className={styles.registrationPageTitle}>{'Important rules!'}</div>
      <RegistrationStatement title={'Be responsible'} description={'Only you are responsible for your security. We’ll not refund your tokens if your keys get stolen'}/>
      <RegistrationStatement title={'Do not share'} description={'If you send your seed phrase to someone = they have full control of your account'}/>
      <RegistrationStatement title={'Make a backup'} description={'We don’t keep track of your personal information, seed phrases and funds'}/>
      <RegistrationStatement title={'Only you have access'} description={'We never transmit or store your seed phrases or other account information\n' +
        'We can’t restore it or freeze it'}/>
    </RegistrationBackground>
    <div className={styles.registrationButtonsHolder}>
      <Button
        className={classnames(styles.registrationNextButton, styles.registrationNextButton_outlined)}
        variant='outlined'
        size='large'
        onClick={props.setPrevStep}
      >
        <span className={styles.registrationNextButtonText}>
          {'Back'}
        </span>
      </Button>
      <Button
        className={styles.registrationNextButton}
        variant='contained'
        size='large'
        onClick={props.setNextStep}
      >
        {'Next'}
      </Button>
    </div>
  </>
};
