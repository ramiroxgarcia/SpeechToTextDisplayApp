import React, { useState, useEffect } from 'react';
import { View, Text, Button, PermissionsAndroid, Platform, Alert } from 'react-native';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions'; // Import permissions
import { BleManager, Device } from "react-native-ble-plx";

const VoiceRecognition = () => {
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false); // Track listening state

  const [bleManager] = useState(new BleManager());
  const [device, setDevice] = useState<Device | null>(null);
  const [espConnected, setEspConnected] = useState(false);

  const espServiceUUID = '';
  const espCharacteristicUUID = '';

  useEffect(() => {
    // Assign correct event handlers
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    startBluetooth();

    // Cleanup listeners on component unmount
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

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
      console.log('not connected')
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


  const onSpeechResults = (event: SpeechResultsEvent) => {
    // Check if event.value is defined and has values
    if (event.value && Array.isArray(event.value) && event.value.length > 0) {
      // Set recognized text to the latest recognized phrase
      setRecognizedText(event.value[0]); // Replace with the most recent phrase

      sendResultString(event.value[0]); // send recognized text esp

      startListening();
    }
  };

  const onSpeechError = (event: SpeechErrorEvent) => {
    if (event.error && event.error.message) {
      setError(event.error.message);
    } else {
      setError('Unknown error occurred');
    }
  };

  // Request Microphone Permission
  const requestMicrophonePermission = async () => {
    const result = await request(PERMISSIONS.ANDROID.RECORD_AUDIO);
    if (result === RESULTS.GRANTED) {
      console.log("Microphone permission granted");
      startListening(); // Start listening after permission is granted
    } else {
      Alert.alert("Permission Denied", "Microphone access is required to use voice recognition.");
    }
  };

  const startListening = async () => {
    try {
      await Voice.start('en-US');
      setIsListening(true); // Set listening state to true
      setError('');
    } catch (e) {
      console.error(e);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false); // Set listening state to false
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View>
      {espConnected ? (
        <>
          <Button 
            title={isListening ? "Listening..." : "Start Listening"} 
            onPress={isListening ? stopListening : requestMicrophonePermission} 
          />
          {isListening && (
            <Button title="Stop Listening" onPress={stopListening} />
          )}
          <Text style={{ fontSize: 24, padding: 20 }}>Recognized Text: {recognizedText}</Text>
          {error ? <Text>Error: {error}</Text> : null}
        </>
      ) : (
        <View>
          <Text style={{margin: "auto"}}>Attachment not connected</Text>
            <Button title="Scan and Connect" onPress={scanBluetoothForESP}>
            </Button>
        </View>
      )}
    </View>
  );
};

export default VoiceRecognition;