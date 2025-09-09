import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  PermissionsAndroid,
  View,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import CallLogs, { CallLog } from 'react-native-call-log';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- API URL ---
// Make sure this is the correct IP address for your development server.
// For a physical device, this must be your computer's network IP.
const API_URL = 'http://10.106.29.101:3000/api/logs';

// --- HEADLESS TASK (runs in the background) ---
export const CallSyncTask = async () => {
  console.log('[Headless Task] Task started.');
  try {
    const hasPermissions = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
    if (!hasPermissions) {
      console.log('[Headless Task] Missing READ_CALL_LOG permission. Aborting.');
      return;
    }

    const lastSyncTimestamp = await AsyncStorage.getItem('lastSyncTimestamp');
    const lastTimestamp = lastSyncTimestamp ? parseInt(lastSyncTimestamp, 10) : 0;

    // Fetch all logs since the last sync. We filter by duration and valid timestamp in our code.
    const logs: CallLog[] = await CallLogs.load(-1, {
      minTimestamp: lastTimestamp.toString(),
    });

    // Filter out invalid, very short ( <1s), or already processed logs
    const newLogs = logs.filter((log: CallLog) => {
      const timestamp = parseInt(log.timestamp, 10);
      return !isNaN(timestamp) && timestamp > lastTimestamp && log.duration > 0;
    });

    if (newLogs.length > 0) {
      console.log(`[Headless Task] Found ${newLogs.length} new, valid log(s).`);

      // The API expects an array of logs
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLogs),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with status ${response.status}: ${errorText}`);
      }

      // Find the timestamp of the most recent log we just synced
      const latestTimestamp = Math.max(...newLogs.map((log: CallLog) => parseInt(log.timestamp, 10)));
      await AsyncStorage.setItem('lastSyncTimestamp', latestTimestamp.toString());
      console.log(`[Headless Task] Sync complete. Newest timestamp set to: ${latestTimestamp}`);
    } else {
      console.log('[Headless Task] No new logs to sync.');
    }
  } catch (error) {
    console.error('[Headless Task] Error during sync:', error);
  }
};


// --- MAIN APP COMPONENT ---
const App = () => {
  const [status, setStatus] = useState('Initializing...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS !== 'android') {
        setStatus('This app is designed for Android only.');
        setIsLoading(false);
        return;
      }

      setStatus('Requesting permissions...');
      try {
        const permissionsToRequest = [
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        ];
        
        // For Android 13+ (API 33), POST_NOTIFICATIONS is needed for foreground services
        if (Platform.Version >= 33) {
          permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        }

        const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);
        
        const allGranted = Object.values(granted).every(
          result => result === PermissionsAndroid.RESULTS.GRANTED
        );

        if (allGranted) {
          setStatus('Permissions granted. The app is active and will sync automatically after a call ends.');
          // Start the foreground service
          if (Platform.OS === 'android') {
            const { AppState, NativeModules } = require('react-native');
            const startService = () => {
              const { CallDetectionManager } = NativeModules;
              if (CallDetectionManager && CallDetectionManager.startService) {
                  CallDetectionManager.startService();
              }
            };
            startService();
            AppState.addEventListener('change', (nextAppState: string) => {
                if (nextAppState === 'active') {
                    startService();
                }
            });
          }
        } else {
          setStatus('Permissions denied. The app cannot function without them. Please grant permissions in settings.');
          Alert.alert(
            'Permissions Required',
            'This app needs call log and phone state permissions to work. Please enable them in your app settings.',
            [
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred.';
        setStatus(`Error: ${errorMsg}`);
        Alert.alert('Error', errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    requestPermissions();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Call Log Sync</Text>
        <Text style={styles.subtitle}>Automatic Service</Text>
      </View>
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>STATUS</Text>
        {isLoading && <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />}
        <Text style={styles.statusText}>{status}</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.infoText}>
          This app runs automatically in the background. No manual action is needed.
        </Text>
        <Text style={styles.infoText}>
          After a phone call is completed, the log will be synced to the server.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    position: 'absolute',
    top: 80,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 20,
    color: '#475569',
    marginTop: 8,
  },
  statusContainer: {
    marginVertical: 20,
    padding: 25,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 150,
    justifyContent: 'center',
    elevation: 2,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 15,
  },
  statusText: {
    fontSize: 16,
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 24,
  },
  loader: {
    marginBottom: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
  },
});

export default App;

