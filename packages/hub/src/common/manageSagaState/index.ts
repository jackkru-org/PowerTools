import { PayloadAction } from '@reduxjs/toolkit';
import { put } from 'typed-redux-saga';
import { toast } from 'react-toastify';
import { startAction, stopAction } from 'network/slice';

const manageSagaState = (saga: any) => (function* (action: PayloadAction<any>) {
  try {
    yield* put(startAction({ name: action.type, params: action.payload }));
    yield* saga(action);
  } catch (err: any) {
    if (err.networkError) {
      toast.error('Network error');
    } else {
      console.error(err);
      toast.error(err.message);
    }
  } finally {
    yield* put(stopAction({ name: action.type, params: action.payload }));
  }
});

export default manageSagaState;
