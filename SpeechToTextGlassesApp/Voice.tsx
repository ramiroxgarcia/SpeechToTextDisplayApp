import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, PermissionsAndroid, Platform, Alert } from 'react-native';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions'; // Import permissions
import { BleManager, Device, DeviceId } from "react-native-ble-plx";

const bleManager = new BleManager()
global.Buffer = require('buffer').Buffer;

const VoiceRecognition = () => {
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false); // Track listening state

  const [device, setDevice] = useState<Device | null>(null);
  const [espConnected, setEspConnected] = useState(false);

  const deviceRef = useRef(device);
  const espConnectedRef = useRef(espConnected)

  const espServiceUUID = '';
  const espCharacteristicUUID = '';

  useEffect(() => {
    // Assign correct event handlers
    console.log('on mount')
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    // console.log('destroing ble manager')
    // const dev = bleManager.cancelDeviceConnection('30:C9:22:B1:3F:7E' as DeviceId ?? '' as DeviceId)
    // console.log('device closed: ' + dev)
    requestBluetoothPermission();



    // Cleanup listeners on component unmount
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      // console.log('destroing ble manager')
      // const dev = bleManager.cancelDeviceConnection('30:C9:22:B1:3F:7E' as DeviceId ?? '' as DeviceId)
      // console.log('device closed: ' + dev)
    };
  }, []);

  useEffect(() => {
    deviceRef.current = device;
  }, [device]);

  useEffect(() => {
    espConnectedRef.current = espConnected;
  }, [espConnected]);

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
      const connectedDevices = await bleManager.connectedDevices(['ABCD']);

      console.log('connect devices: ' + connectedDevices)

      const dev = connectedDevices.find(d => d.name === 'SpeechToTextGlasses')
      console.log('device found: ' + dev)

      if (dev && !dev.isConnected) {
        console.log('already connected bruh')
        setDevice(dev)
        setEspConnected(true)
        connectToESP(dev)
      }
      else {
        // ESP not yet connected, scan for ESP
        await scanBluetoothForESP();
      }
    
  }

  const scanBluetoothForESP = async () => {
    console.log('scanning')
    bleManager.startDeviceScan(null, null, async (error, scannedDevice) => {
      // console.log(scannedDevice)
      // if (error) {
      //   console.log('hit')r
      //   console.log(error);
      //   return;
      // }

      if (scannedDevice && scannedDevice.name === 'SpeechToTextGlasses') {
        console.log('device scanned')
        bleManager.stopDeviceScan();
        connectToESP(scannedDevice);
        // bleManager.connectToDevice(scannedDevice.id,{
        //   autoConnect: true,
        // })
      }
    })
    console.log('not found')
  }
  
  const connectToESP = async (scannedDevice: Device) => {
    try {
      const connectedDevice = await scannedDevice.connect().then((device) => {
        return device.discoverAllServicesAndCharacteristics()
      });
      // console.log(connectedDevice)
      setDevice(connectedDevice);
      setEspConnected(true);
    } catch (e) {
      console.error('Error connecting to ESP', e);
    }
  }

  const sendResultString = async (sendString: string) => {
    // console.log(deviceRef.current)
    if (!deviceRef.current || !espConnectedRef.current) {
      console.log(espConnectedRef.current)
      console.log('not connected')
      return;
    }

    try {

      let test = "0"

      // wait until ESP is ready
      while (test.trim() === "0") {
        console.log('stuck')
        try {
          const charc = await deviceRef.current.readCharacteristicForService("ABCD", "2222")
          test = charc?.value ? Buffer.from(charc.value, 'base64').toString('utf-8') : ""
        }
        catch (e) {
          console.log('Error reading characteristic:', e);
          break;
        }

        console.log('stuck val:')
        console.log(test +'1213')
      }
      
      console.log('test:')
      console.log(test)

      try {
        console.log(sendString)
        console.log('sending: ' + Buffer.from(sendString, 'utf-8').toString('base64'))
        await deviceRef.current.writeCharacteristicWithResponseForService(
          "ABCD",
          "1111",
          Buffer.from(sendString, 'utf-8').toString('base64')
        );
      }
      catch (e) {
        console.log('Error writing characteristic:', e);
      }

      // test read
      const charc = await deviceRef.current.readCharacteristicForService("ABCD", "1111")
      let test2 = charc?.value ? Buffer.from(charc.value, 'base64').toString('utf-8') : ""
      console.log('just written: ' + test2)

      await deviceRef.current.writeCharacteristicWithoutResponseForService(
        "ABCD",
        "2222",
        Buffer.from("0", 'utf-8').toString('base64')
      );
    }
    catch (e) {
      console.log('Error sending message to ESP', e);
    }
  }


  const onSpeechResults = async (event: SpeechResultsEvent) => {
    // Check if event.value is defined and has values
    if (!deviceRef.current) {
      console.log("Device is null");
      return; // Early exit if device is not available
    }
    if (event.value && Array.isArray(event.value) && event.value.length > 0) {
      // Set recognized text to the latest recognized phrase
      setRecognizedText(event.value[0]); // Replace with the most recent phrase

      await sendResultString(event.value[0]); // send recognized text esp

      startListening();
    }
  };

  const onSpeechError = (event: SpeechErrorEvent) => {
    if (event.error && event.error.message) {
      setError(event.error.message);
    } else {
      setError('Unknown error occurred');
    }
    startListening();
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
    console.log('listening device:')
    // console.log(deviceRef.current)
    try {
      await Voice.start('en-US');
      setIsListening(true); // Set listening state to true
      setError('');
    } catch (e) {
      console.error(e);
    }
    // await sendResultString("Under the clear night sky, the city lights flickered like tiny stars, casting a warm glow over the quiet streets. A gentle wind whispered through the trees,")
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
            <Button title="Scan and Connect" onPress={startBluetooth}>
            </Button>
        </View>
      )}
    </View>
  );
};

export default VoiceRecognition;