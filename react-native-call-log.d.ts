declare module 'react-native-call-log' {
  export interface CallLog {
    timestamp: string;
    dateTime: string;
    duration: number;
    name: string | null;
    phoneNumber: string;
    rawType: number;
    type: 'INCOMING' | 'OUTGOING' | 'MISSED' | 'UNKNOWN';
  }

  interface LoadOptions {
    limit?: number;
    offset?: number;
    minTimestamp?: string;
    maxTimestamp?: string;
    phoneNumbers?: string | string[];
  }

  const CallLogs: {
    load(limit: number, options?: LoadOptions): Promise<CallLog[]>;
  };

  export default CallLogs;
}
