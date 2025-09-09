import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { CallSyncTask } from './App'; // Import the task

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerHeadlessTask('CallSync', () => CallSyncTask); // Register the headless task
