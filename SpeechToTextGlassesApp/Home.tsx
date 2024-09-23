import { Text, View } from "react-native";
import VoiceUI from "./voice_ui";
import React, { useState, useEffect } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';



export default function Home() {
  const [results, setResults] = useState('');

  const handleStartListening = () => {
    setResults('started listening');
  };

  const handleEndListening = () => {
    setResults('stopped listening');
  };

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
      <VoiceUI onEndListen={handleEndListening} onStartListen={handleStartListening} results={results}></VoiceUI>
    </GestureHandlerRootView>
  );
}
