import { Platform } from 'react-native';

// Do not load native TaskManager/location code into the public web startup
// path. Native builds evaluate the module immediately and register the task.
if (Platform.OS !== 'web') {
  void import('./riderLocation');
}

export {};
