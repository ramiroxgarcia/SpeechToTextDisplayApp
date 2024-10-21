import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions'; // Import permissions

const VoiceRecognition = () => {
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [error, setError] = useState<string>('');

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
    if (event.value && event.value.length > 0) {
      setRecognizedText(event.value[0]);
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
      setError('');
    } catch (e) {
      console.error(e);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View>
      <Button title="Start Listening" onPress={requestMicrophonePermission} />
      <Button title="Stop Listening" onPress={stopListening} />
      {recognizedText ? <Text>Recognized Text: {recognizedText}</Text> : null}
      {error ? <Text>Error: {error}</Text> : null}
    </View>
  );
};

export default VoiceRecognition;