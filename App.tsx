import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  PermissionsAndroid,
  View,
  Platform,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import CallLogs from 'react-native-call-log';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- API URL ---
const API_URL = 'http://10.106.29.101:3000/api/logs';

// --- HEADLESS TASK (runs in the background) ---
export const CallSyncTask = async () => {
  console.log('[Headless Task] Call ended, starting sync...');
  try {
    // Fetch the timestamp of the last synced log
    const lastSyncTimestamp = await AsyncStorage.getItem('lastSyncTimestamp');
    
    // Fetch logs newer than the last sync
    const newLogs = await CallLogs.load(1, { minTimestamp: lastSyncTimestamp || '0' });

    if (newLogs.length > 0) {
      console.log(`[Headless Task] Found ${newLogs.length} new log(s).`);
      
      // Send to server
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLogs),
      });

      if (!response.ok) {
        throw new Error('Server responded with an error.');
      }

      // Update the timestamp to the newest log we just synced
      const latestTimestamp = newLogs[0].timestamp;
      await AsyncStorage.setItem('lastSyncTimestamp', latestTimestamp);
      console.log(`[Headless Task] Sync complete. Newest timestamp: ${latestTimestamp}`);
    } else {
      console.log('[Headless Task] No new logs to sync.');
    }
  } catch (error) {
    console.error('[Headless Task] Error:', error);
  }
};

// --- MAIN APP COMPONENT ---
class App extends React.Component {
  state = {
    status: 'Ready.',
    isLoading: false,
  };

  componentDidMount() {
    this.requestPermissions();
  }

  requestPermissions = async () => {
    this.setState({ status: 'Requesting permissions...', isLoading: true });
    if (Platform.OS !== 'android') {
      this.setState({ status: 'This app is for Android only.', isLoading: false });
      return;
    }
    try {
      const permissionsToRequest = [
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      ];
      if (Platform.Version >= 33) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }
      const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);
      const allGranted = Object.values(granted).every(
        (result) => result === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        throw new Error('All permissions are required for the app to function.');
      }

      this.setState({ status: 'Permissions granted. App is active and will sync on call end.', isLoading: false });

    } catch (err) {
      const errorMsg = err.message || 'An error occurred during permission request.';
      this.setState({ status: errorMsg, isLoading: false });
      Alert.alert('Error', errorMsg);
    }
  };

  // Manual sync button for testing or first-time use
  manualSync = async () => {
    this.setState({ status: 'Performing manual sync...', isLoading: true });
    await CallSyncTask(); // Run the same task manually
    this.setState({ status: 'Manual sync finished.', isLoading: false });
  };

  render() {
    const { status, isLoading } = this.state;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Call Log Sync</Text>
          <Text style={styles.subtitle}>Real-time Service</Text>
        </View>
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={styles.statusText}>{status}</Text>
          {isLoading && <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 15 }} />}
        </View>
        
        <TouchableOpacity style={styles.button} onPress={this.manualSync} disabled={isLoading}>
          <Text style={styles.buttonText}>Run Manual Sync</Text>
        </TouchableOpacity>

        <Text style={styles.infoText}>
          This app runs in the background. After a call ends, it will automatically sync the log.
        </Text>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', alignItems: 'center', justifyContent: 'center', padding: 20, },
  header: { alignItems: 'center', marginBottom: 40, },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1e293b', },
  subtitle: { fontSize: 18, color: '#475569', marginTop: 5, },
  statusContainer: { marginVertical: 20, padding: 15, backgroundColor: '#ffffff', borderRadius: 8, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', minHeight: 100, },
  statusLabel: { fontSize: 16, fontWeight: '600', color: '#475569', },
  statusText: { fontSize: 14, color: '#1e293b', marginTop: 5, textAlign: 'center', },
  infoText: { marginTop: 40, fontSize: 14, color: '#64748b', textAlign: 'center', paddingHorizontal: 20, },
  button: { marginTop: 30, backgroundColor: '#2563eb', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 8, elevation: 2, },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
});

export default App;

