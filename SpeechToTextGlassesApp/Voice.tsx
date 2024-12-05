import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, PermissionsAndroid, Platform, Alert, StyleSheet, Pressable } from 'react-native';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
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

  useEffect(() => {
    // Assign correct event handlers
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    BleManager.start({ showAlert: false });


    // Cleanup listeners on component unmount
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);

      // disconnect on unmount
      BleManager.disconnect("30:C9:22:B1:3F:7E")
      .catch((error) => {
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
          console.log('perms ok');
        } else {
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ).then(result => {
            if (result) {
              console.log('user accepted');
            } else {
              console.log('user refused');
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
      if (peripheralsArray.length != 0) {
        for (let i = 0; i < peripheralsArray.length; i++) {
          let device = peripheralsArray[i]

          if (device && device.name === 'SpeechToTextGlasses') {
            setEspConnected(true) // device already connected
          }

        }
        return;
      }
    });
  }
  
  const connectToESP = async () => {
    BleManager.connect("30:C9:22:B1:3F:7E")
      .then(() => {
        setEspConnected(true);
        setConnectionError('');
      })
      .catch((error) => {
        // failure
        console.log(error);
        setConnectionError(error);
      });
  }

  const sendResultString = async (sendString: string) => {
    if (!espConnectedRef.current) { // esp not connected somehow
      console.log(espConnectedRef.current)
      console.log('not connected')
      return;
    }

    try {

      // ready flag receieved from ESP32, when received as "1", ESP32 is ready for a new message
      let readyFlag = "0"

      // wait until ESP is ready
      while (readyFlag.trim() === "0") {
        try {
          let charc = await BleManager.read('30:C9:22:B1:3F:7E', 'ABCD', '2222')
          readyFlag = String.fromCharCode(charc[0])
        }
        catch (e) {
          if (e === 'Peripheral not found') {
            setEspConnected(false);
            setConnectionError(e);
            return;
          }
          break;
        }
      }

      try {
        // max size of caption is 254 characters
        if (sendString.length > 255) {
          sendString = sendString.substring(0, 255)
        }
        
        const buffer = Buffer.from(sendString + "\0")   // append null char
        
        // write current captions result to ESP32
        await BleManager.write('30:C9:22:B1:3F:7E', 'ABCD', '1111', buffer.toJSON().data, 255)
      }
      catch (e) {
        console.log('Error writing characteristic:', e);
        if (e === 'Peripheral not found') {
          setEspConnected(false);
          setConnectionError(e);
          return;
        }
      }

      // set ready flag to unready to let ESP32 know buffer is awaiting service
      await BleManager.write('30:C9:22:B1:3F:7E', 'ABCD', '2222', [48])
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
    if (event.value && Array.isArray(event.value) && event.value.length > 0 && listeningStateRef.current) {
      // Set recognized text to the latest recognized phrase
      setRecognizedText(event.value[0]); // Replace with the most recent phrase

      await sendResultString(event.value[0]); // send recognized text esp

      console.log(listeningStateRef.current)
      if(listeningStateRef.current){
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
    try {
      await Voice.start('en-US');
      setIsListening(true); // Set listening state to true
      setError('');
    } catch (e) {
      // console.error(e);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setlisteningState(false);
      setIsListening(false); // Set listening state to false
      setRecognizedText('');
    } catch (e) {
      // console.error(e);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listenButton: {
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
      elevation: 20
      
    },
    listenButtonPressed: {
      backgroundColor: '#a9d6bc',
      transform: [{ scale: 0.95 }]
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
          style={[styles.listenButton,
            isPressed && styles.listenButtonPressed, ]}
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
          <Pressable style={[styles.listenButton, isPressed && styles.listenButtonPressed]} 
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