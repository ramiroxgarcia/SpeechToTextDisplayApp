import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, PermissionsAndroid, Platform, Alert } from 'react-native';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions'; // Import permissions
import BleManager from 'react-native-ble-manager'

global.Buffer = require('buffer').Buffer;

const VoiceRecognition = () => {
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false); // Track listening state

  const [espConnected, setEspConnected] = useState(false);

  const espConnectedRef = useRef(espConnected)

  const espServiceUUID = '';
  const espCharacteristicUUID = '';

  useEffect(() => {
    // Assign correct event handlers
    console.log('on mount')
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    BleManager.start({ showAlert: false }).then(() => {
      // Success code
      console.log("Module initialized");
    });

    // console.log('destroing ble manager')
    // const dev = bleManager.cancelDeviceConnection('30:C9:22:B1:3F:7E' as DeviceId ?? '' as DeviceId)
    // console.log('device closed: ' + dev)

    startBluetooth();



    // Cleanup listeners on component unmount
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      // console.log('destroing ble manager')
      // const dev = bleManager.cancelDeviceConnection('30:C9:22:B1:3F:7E' as DeviceId ?? '' as DeviceId)
      // console.log('device closed: ' + dev)
    };
  }, []);

  useEffect(() => {
    espConnectedRef.current = espConnected;
  }, [espConnected]);

  const requestBluetoothPermission = async () => {
    BleManager.enableBluetooth().then(() => {
        console.log("The bluetooth is already enabled or the user confirm");
      }
    )

    if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ).then(result => {
        if (result) {
          console.log('Permission is OK');
        } else {
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ).then(result => {
            if (result) {
              console.log('User accept');
            } else {
              console.log('User refuse');
            }
          });
        }
      });
    }
  }

  const startBluetooth = async () => {
      requestBluetoothPermission();

      // get connected devices
      BleManager.getConnectedPeripherals([]).then((peripheralsArray) => {
        // Success code
        if (peripheralsArray.length != 0) {
          for (let i = 0; i < peripheralsArray.length; i++) {
            let device = peripheralsArray[i]

            console.log('connected device: ' + device)

            if (device && device.name === 'SpeechToTextGlasses') {
              setEspConnected(true)
            }

          }
        }



        console.log("Connected peripherals: " + peripheralsArray.length);
      });
  }
  
  const connectToESP = async () => {
    // try {
    //   const connectedDevice = await scannedDevice.connect().then((device) => {
    //     return device.discoverAllServicesAndCharacteristics()
    //   });
    //   // console.log(connectedDevice)
    //   setDevice(connectedDevice);
    //   setEspConnected(true);
    // } catch (e) {
    //   console.error('Error connecting to ESP', e);
    // }
  }

  const sendResultString = async (sendString: string) => {
    // console.log(deviceRef.current)
    if (!espConnectedRef.current) {
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
          let charc = await BleManager.read('30:C9:22:B1:3F:7E', 'ABCD', '2222')
          test = charc[0].toString()
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
        const buffer = Buffer.from(sendString)
        console.log('sending: ' + buffer.toJSON().data)
        await BleManager.write('30:C9:22:B1:3F:7E', 'ABCD', '2222', buffer.toJSON().data)
      }
      catch (e) {
        console.log('Error writing characteristic:', e);
      }

      // test read
      // const charc = await deviceRef.current.readCharacteristicForService("ABCD", "1111")
      // let test2 = charc?.value ? Buffer.from(charc.value, 'base64').toString('utf-8') : ""
      // console.log('just written: ' + test2)

      const buffer = Buffer.from(sendString)

      await BleManager.write('30:C9:22:B1:3F:7E', 'ABCD', '2222', [0])
    }
    catch (e) {
      console.log('Error sending message to ESP', e);
    }
  }


  const onSpeechResults = async (event: SpeechResultsEvent) => {
    // Check if event.value is defined and has values
    if (!espConnectedRef.current) {
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
        </View>
      )}
    </View>
  );
};

export default VoiceRecognition;