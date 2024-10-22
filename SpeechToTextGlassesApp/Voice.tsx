import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions'; // Import permissions

const VoiceRecognition = () => {
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false); // Track listening state

  useEffect(() => {
    // Assign correct event handlers
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    // Cleanup listeners on component unmount
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechResults = (event: SpeechResultsEvent) => {
    // Check if event.value is defined and has values
    if (event.value && Array.isArray(event.value) && event.value.length > 0) {
      // Set recognized text to the latest recognized phrase
      setRecognizedText(event.value[0]); // Replace with the most recent phrase
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
      <Button 
        title={isListening ? "Listening..." : "Start Listening"} 
        onPress={isListening ? stopListening : requestMicrophonePermission} 
      />
      {isListening && (
        <Button title="Stop Listening" onPress={stopListening} />
      )}
      <Text style={{ fontSize: 24, padding: 20 }}>Recognized Text: {recognizedText}</Text>
      {error ? <Text>Error: {error}</Text> : null}
    </View>
  );
};

export default VoiceRecognition;