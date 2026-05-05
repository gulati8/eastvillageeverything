import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import type { PlaceResponse } from '@eve/shared-types';
import { isOpenNow, getClosingTime, formatClosesIn } from './hours';
import { computeSignal } from './signal';
import type { SignalResult } from './signal';

export interface OpenStatus {
  isOpen: boolean;
  closesIn: string | null;
  closingTime: Date | null;
}

const DEFAULT_OPEN_STATUS: OpenStatus = {
  isOpen: false,
  closesIn: null,
  closingTime: null,
};

const DEFAULT_SIGNAL: SignalResult = { kind: null, urgent: false, label: null };

export function useOpenStatus(place: PlaceResponse | undefined): OpenStatus {
  const [status, setStatus] = useState<OpenStatus>(DEFAULT_OPEN_STATUS);

  const compute = useCallback(() => {
    if (!place || !place.hours_json) {
      setStatus(DEFAULT_OPEN_STATUS);
      return;
    }
    const now = new Date();
    const hoursJson = place.hours_json;
    const isOpen = isOpenNow(hoursJson, now);
    const closingTime = getClosingTime(hoursJson, now);
    const closesIn = formatClosesIn(closingTime, now);
    setStatus({ isOpen, closesIn, closingTime });
  }, [place]);

  useEffect(() => {
    compute();

    const intervalRef = { current: setInterval(compute, 60_000) };

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        compute();
        intervalRef.current = setInterval(compute, 60_000);
      } else {
        clearInterval(intervalRef.current);
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [compute]);

  return status;
}

export function useSignal(place: PlaceResponse | undefined): SignalResult {
  const [signal, setSignal] = useState<SignalResult>(DEFAULT_SIGNAL);

  const compute = useCallback(() => {
    if (!place) {
      setSignal(DEFAULT_SIGNAL);
      return;
    }
    setSignal(computeSignal(place, new Date()));
  }, [place]);

  useEffect(() => {
    compute();

    const intervalRef = { current: setInterval(compute, 60_000) };

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        compute();
        intervalRef.current = setInterval(compute, 60_000);
      } else {
        clearInterval(intervalRef.current);
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [compute]);

  return signal;
}
