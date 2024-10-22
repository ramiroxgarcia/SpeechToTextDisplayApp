import { Button, PermissionsAndroid, Platform, Text, View } from "react-native";
import VoiceUI from "./voice_ui";
import VoiceRecognition from "./Voice";
import React, { useState, useEffect } from "react";
import { GestureHandlerRootView, Pressable } from 'react-native-gesture-handler';
import { BleManager, Device } from "react-native-ble-plx";



export default function Home() {
  const [results, setResults] = useState('');
  const [bleManager] = useState(new BleManager());
  const [device, setDevice] = useState<Device | null>(null);
  const [espConnected, setEspConnected] = useState(false);

  const espServiceUUID = '';
  const espCharacteristicUUID = '';

  const requestBluetoothPermission = async () => {
    if (Platform.OS === 'ios') {
      return true
    }
    if (Platform.OS === 'android' && PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
      const apiLevel = parseInt(Platform.Version.toString(), 10)
  
      if (apiLevel < 31) {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
        return granted === PermissionsAndroid.RESULTS.GRANTED
      }
      if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN && PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        ])

        console.log('perms granted')
        console.log(result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED);
        
        return (
          result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        )
      }
    }
  
    console.log('Permission have not been granted')
  
    return false
  }

  const startBluetooth = async () => {
    requestBluetoothPermission();
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
    console.log('scanning')
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

  const handleStartListening = () => {
    setResults('started listening');
  };

  const handleEndListening = () => {
    setResults('stopped listening');
  };

  useEffect(() => {
    console.log(results);
  }, [results]);

  // on mount
  useEffect(() => {
    console.log('starting up bluetooth')
    startBluetooth();
  }, []);
  
  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {espConnected ? (
        <VoiceUI onEndListen={handleEndListening} onStartListen={handleStartListening} results={results} />
      ) : (
        <View>
          <Text style={{margin: "auto"}}>Attachment not connected</Text>
            <Button title="Scan and Connect" onPress={scanBluetoothForESP}>
            </Button>
        </View>
      )}
      <VoiceRecognition/>
    </GestureHandlerRootView>
  );
}
