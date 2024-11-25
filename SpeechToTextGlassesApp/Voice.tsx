import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, PermissionsAndroid, Platform, Alert, StyleSheet, Pressable } from 'react-native';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions'; // Import permissions
import BleManager from 'react-native-ble-manager'
import {LogBox} from 'react-native';
import { BleManager as BlePlxManager, Device, NativeDevice } from 'react-native-ble-plx';


global.Buffer = require('buffer').Buffer;
const blePlxManager = new BlePlxManager()
LogBox.ignoreLogs([
  /`new NativeEvent.*/,
]);

const VoiceRecognition = () => {
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [connectError, setConnectionError] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false); // Track listening state
  const [listeningState, setlisteningState] = useState<boolean>(false); 
  const [espConnected, setEspConnected] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const espConnectedRef = useRef(espConnected)

  const listeningStateRef = useRef(listeningState)
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

    // startBluetooth();



    // Cleanup listeners on component unmount
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      // console.log('destroing ble manager')
      // const dev = bleManager.cancelDeviceConnection('30:C9:22:B1:3F:7E' as DeviceId ?? '' as DeviceId)
      // console.log('device closed: ' + dev)

      BleManager.disconnect("30:C9:22:B1:3F:7E")
      .then(() => {
        // Success code
        console.log("Disconnected");
      })
      .catch((error) => {
        // Failure code
        console.log(error);
      });
    };
  }, []);
  useEffect(() => {
    listeningStateRef.current = listeningState;
  }, [listeningState]);

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

      await checkConnected();

      if (!espConnected) {
        await connectToESP();
      }
  }

  const checkConnected = async () => {
    // get connected devices
    BleManager.getConnectedPeripherals([]).then((peripheralsArray) => {
      // Success code
      console.log('prehit')
      if (peripheralsArray.length != 0) {
        for (let i = 0; i < peripheralsArray.length; i++) {
          let device = peripheralsArray[i]

          console.log('connected device: ' + device)

          if (device && device.name === 'SpeechToTextGlasses') {
            setEspConnected(true)
          }

        }
        return;
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


    BleManager.connect("30:C9:22:B1:3F:7E")
      .then(() => {
        // Success code
        console.log("Connected");
        setEspConnected(true);
        setConnectionError('');
      })
      .catch((error) => {
        // Failure code
        console.log(error);
        setConnectionError(error);

      });
  }

  const sendResultString = async (sendString: string) => {

    // console.log(deviceRef.current)
    if (!espConnectedRef.current) {
      console.log(espConnectedRef.current)
      console.log('not connected')
      return;
    }

    const nativeDevice = {
      id: '30:C9:22:B1:3F:7E',                  // Device ID (MAC address or UUID)
      mtu: 23,                   // Maximum Transmission Unit
      rawScanRecord: 'MTIz',      // Base64-encoded string for raw scan data (example: 'MTIz' is Base64 for '123')
      name: 'SpeechToTextGlasses',                 // Optional fields can be set to null
      rssi: null,
      manufacturerData: null,
      serviceData: null,
      serviceUUIDs: null,
      localName: null,
      txPowerLevel: null,
      solicitedServiceUUIDs: null,
      isConnectable: null,
      overflowServiceUUIDs: null
  };
  
  const device = new Device(nativeDevice, blePlxManager);

    try {

      let test = "0"

      // wait until ESP is ready
      while (test.trim() === "0") {
        console.log('stuck')
        try {
          let charc = await BleManager.read('30:C9:22:B1:3F:7E', 'ABCD', '2222')
          console.log('pure read ' + charc)
          test = String.fromCharCode(charc[0])
          // const charc = await device.readCharacteristicForService("ABCD", "2222")
          // test = charc?.value ? Buffer.from(charc.value, 'base64').toString('utf-8') : ""
        }
        catch (e) {
          console.log('Error reading characteristic:', e);
          break;
        }

        console.log('stuck val just read: ' + test)
      }
      
      console.log('test just read: ' + test)

      try {
        console.log(sendString.length)

        if (sendString.length > 255) {
          console.log('hit len')
          sendString = sendString.substring(0, 255)
          console.log(sendString.length)
        }
        
        const buffer = Buffer.from(sendString + "\0")
        


        console.log('sending: ' + buffer.toJSON().data)


        // convert the ASCII array to a string
        const messageString = String.fromCharCode(...buffer.toJSON().data);

        // encode the string to base64
        // const base64Message = Buffer.from(messageString).toString('base64');

        // let messageEncoded = Array.from(messageString).map(char => char.charCodeAt(0));
        
        await BleManager.write('30:C9:22:B1:3F:7E', 'ABCD', '1111', buffer.toJSON().data, 255)

        // console.log('just sent: ' + messageEncoded)
        // console.log('sending: ' + Buffer.from(sendString, 'utf-8').toString('base64'))
        // await device.writeCharacteristicWithResponseForService(
        //   "ABCD",
        //   "1111",
        //   Buffer.from(sendString, 'utf-8').toString('base64')
        // );
      }
      catch (e) {
        console.log('Error writing characteristic:', e);
      }

      // test read

      const buffer = Buffer.from(sendString)

      await BleManager.write('30:C9:22:B1:3F:7E', 'ABCD', '2222', [48])
      // await device.writeCharacteristicWithoutResponseForService(
      //   "ABCD",
      //   "2222",
      //   Buffer.from("0", 'utf-8').toString('base64')
      // );
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

      console.log(listeningStateRef.current)
      if(listeningStateRef.current){
        console.log('still istening')
        startListening();
      }
    }
  };

  const onSpeechError = (event: SpeechErrorEvent) => {
    if (event.error && event.error.message) {
      setError(event.error.message);
    } else {
      setError('Unknown error occurred');
    }
    if(listeningStateRef.current){
      startListening();
    }
  };

  // Request Microphone Permission
  const requestMicrophonePermission = async () => {
    const result = await request(PERMISSIONS.ANDROID.RECORD_AUDIO);
    setlisteningState(true);
    if (result === RESULTS.GRANTED) {
      console.log("Microphone permission granted");
      startListening(); // Start listening after permission is granted
      setlisteningState(true);
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
      // console.error(e);
    }
    // await sendResultString("Under the clear night sky, the city lights flickered like tiny stars, casting a warm glow over the quiet streets. A gentle wind whispered through the trees,")
  };

  const stopListening = async () => {
    try {
      console.log('hit1')
      await Voice.stop();
      setlisteningState(false);
      setIsListening(false); // Set listening state to false
      console.log(isListening)
      setRecognizedText('');
    } catch (e) {
      console.log('hit stop')
      // console.error(e);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    button33: {
      borderRadius: 100,
      backgroundColor: '#c2fbd7',
      shadowColor: '#2CBB63',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      color: 'green',
      paddingVertical: 7,
      paddingHorizontal: 20,
      textAlign: 'center',
      fontSize: 16,
      fontFamily: 'CerebriSans-Regular',
      borderWidth: 0,
      transform: [{ scale: 1 }],
      width: 190
        
      ,
      alignContent: 'center',
      margin: 10,
      elevation: 20, // Android shadow
      
    },
    button33Pressed: {
      backgroundColor: '#a9d6bc', // Darker shade of the button color
      transform: [{ scale: 0.95 }], // Scale down for "push in" effect
    },
    text: {
      color: 'black',
      textAlign: 'center',
      fontSize: 16,
      fontWeight : 'bold',
      fontFamily: 'monospace'
    }
  });

  return (
    <View style={styles.container}>
      {espConnected ? (
        <>
          <Pressable
          style={[styles.button33,
            isPressed && styles.button33Pressed, ]}
          onPressIn={() => setIsPressed(true)} // Button is pressed
          onPressOut={() => setIsPressed(false)} // Button is released\
          onPress={isListening ? stopListening : requestMicrophonePermission}>
            <Text style={styles.text}>
              {isListening ? "Stop Listening" : "Start Listening"}
            </Text>
          </Pressable>
          <Text style={{ fontSize: 24, padding: 20, fontFamily: 'monospace' }}>{recognizedText}</Text>
        </>
      ) : (
        <View style={styles.container}>
          <Pressable style={[styles.button33, isPressed && styles.button33Pressed]} 
          onPress={startBluetooth}
          onPressIn={() => setIsPressed(true)} // Button is pressed
          onPressOut={() => setIsPressed(false)} // Button is released\
          >
            <Text style={styles.text}>
              Connect ᛒ
            </Text>
          </Pressable>
          <Text style={{ fontSize: 24, padding: 20, fontFamily: 'monospace' }}>Attachment not connected</Text>
          {connectError.length > 1 && <Text style={{ fontSize: 24, padding: 20, fontFamily: 'monospace' }}>{connectError}. Try again.</Text>
        }
        </View>
      )}
    </View>
  );
  
};

export default VoiceRecognition;