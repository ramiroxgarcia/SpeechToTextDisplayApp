import { Text, View } from "react-native";
import VoiceUI from "./voice_ui";
import React, { useState, useEffect } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BleManager, Device } from "react-native-ble-plx";



export default function Index() {
  const [results, setResults] = useState('');
  const [bleManager] = useState(new BleManager());
  const [device, setDevice] = useState<Device | null>(null);
  const [espConnected, setEspConnected] = useState(false);

  const espServiceUUID = '';
  const espCharacteristicUUID = '';

  const handleStartListening = () => {
    setResults('started listening');
  };

  const handleEndListening = () => {
    setResults('stopped listening');
  };

  const startBluetooth = async () => {
    const connectedDevices = await bleManager.connectedDevices([espServiceUUID]);

    if (connectedDevices.length > 0) {
      // ESP is already connected
      setDevice(connectedDevices[0]);
      setEspConnected(true);
    } else {
      // ESP not yet connected, scan for ESP
      scanBluetoothForESP();
    }
  }

  const scanBluetoothForESP = async () => {
    bleManager.startDeviceScan(null, null, async (error, scannedDevice) => {
      if (error) {
        console.log(error);
        return;
      }

      if (scannedDevice && scannedDevice.name === 'REPLACE WITH ESP NAME') {
        bleManager.stopDeviceScan();
        connectToESP(scannedDevice);
      }
    })
  }
  
  const connectToESP = async (scannedDevice: Device) => {
    try {
      const connectedDevice = await scannedDevice.connect();
      setDevice(connectedDevice);
      setEspConnected(true);
    } catch (e) {
      console.error('Error connecting to ESP', e);
    }
  }

  const sendResultString = async (sendString: string) => {
    if (!device || !espConnected) {
      return;
    }

    try {
      await device.writeCharacteristicWithResponseForService(
        espServiceUUID,
        espCharacteristicUUID,
        sendString
      );
    }
    catch (e) {
      console.log('Error sending message to ESP', e);
    }
  }

  useEffect(() => {
    console.log(results);
  }, [results]);
  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      if (espConnected) {
        <VoiceUI onEndListen={handleEndListening} onStartListen={handleStartListening} results={results}></VoiceUI>
      }
      else {
        <Text>Device not connected</Text>
      }

    </GestureHandlerRootView>
  );
}
