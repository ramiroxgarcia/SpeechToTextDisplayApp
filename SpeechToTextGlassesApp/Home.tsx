import { Button, PermissionsAndroid, Platform, Text, View } from "react-native";
import VoiceUI from "./voice_ui";
import VoiceRecognition from "./Voice";
import React, { useState, useEffect } from "react";
import { GestureHandlerRootView, Pressable } from 'react-native-gesture-handler';
import { BleManager, Device } from "react-native-ble-plx";
import Voice from "./Voice";



export default function Home() {
  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Voice></Voice>
    </GestureHandlerRootView>
  );
}
