package com.calllogsyncapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.TelephonyManager;
import android.util.Log;

import com.facebook.react.HeadlessJsTaskService;

public class PhoneStateReceiver extends BroadcastReceiver {

    private static int lastState = TelephonyManager.CALL_STATE_IDLE;
    private static boolean isIncoming;

    @Override
    public void onReceive(Context context, Intent intent) {
        // Ignore intents that are not for phone state changes
        if (!intent.getAction().equals("android.intent.action.PHONE_STATE")) {
            return;
        }

        String stateStr = intent.getExtras().getString(TelephonyManager.EXTRA_STATE);
        int state = 0;

        if (stateStr.equals(TelephonyManager.EXTRA_STATE_IDLE)) {
            state = TelephonyManager.CALL_STATE_IDLE;
        } else if (stateStr.equals(TelephonyManager.EXTRA_STATE_OFFHOOK)) {
            state = TelephonyManager.CALL_STATE_OFFHOOK;
        } else if (stateStr.equals(TelephonyManager.EXTRA_STATE_RINGING)) {
            isIncoming = true; // Mark that a call is incoming
            state = TelephonyManager.CALL_STATE_RINGING;
        }

        // --- The key logic ---
        // If the previous state was ringing or offhook, and the new state is idle, the call has just ended.
        if ((lastState == TelephonyManager.CALL_STATE_RINGING || lastState == TelephonyManager.CALL_STATE_OFFHOOK) && state == TelephonyManager.CALL_STATE_IDLE) {
            Log.d("PhoneStateReceiver", "Call has just ended. Starting background sync task.");

            // Start the Headless JS service to run our sync logic in the background.
            Intent serviceIntent = new Intent(context, CallSyncService.class);
            context.startService(serviceIntent);
            HeadlessJsTaskService.acquireWakeLockNow(context);
            
            // Reset for the next call
            isIncoming = false;
        }
        
        lastState = state;
    }
}
