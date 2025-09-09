package com.calllogsyncapp;

import android.content.Intent;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class CallDetectionManager extends ReactContextBaseJavaModule {

    private static ReactApplicationContext reactContext;

    CallDetectionManager(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "CallDetectionManager";
    }

    @ReactMethod
    public void startService() {
        reactContext.startService(new Intent(reactContext, CallDetectionService.class));
    }

    @ReactMethod
    public void stopService() {
        reactContext.stopService(new Intent(reactContext, CallDetectionService.class));
    }
}
