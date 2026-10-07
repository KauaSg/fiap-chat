export type NativePushProvider = 'fcm' | 'apns' | 'unknown';

export type DeviceRegistration = {
  deviceId: string;
  expoToken: string;
  nativeToken: string;
  nativeProvider: NativePushProvider;
  platform: 'android' | 'ios';
  enabled: boolean;
  updatedAt: number;
};
