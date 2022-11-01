import { createSelector } from '@reduxjs/toolkit';
import { RootState } from 'application/store';
import { RegistrationState } from '../slice/registrationSlice';

export const getRegistrationState = (state: RootState) => (
  state.registration
);

export const getCurrentShardSelector = createSelector(
  getRegistrationState,
  (registrationState: RegistrationState) => (
    registrationState.currentShard
  ),
);

export const getCurrentRegistrationTab = createSelector(
  getRegistrationState,
  (registrationState: RegistrationState) => (
    registrationState.tab
  ),
);

export const getCurrentCreatingStep = createSelector(
  getRegistrationState,
  (registrationState: RegistrationState) => (
    registrationState.creatingStep
  ),
);

export const getGeneratedSeedPhrase = createSelector(
  getRegistrationState,
  (registrationState: RegistrationState) => (
    registrationState.seedPhrase
  ),
);

export const getLoginErrors = createSelector(
  getRegistrationState,
  (registrationState: RegistrationState) => (
    registrationState.loginErrors
  ),
);
