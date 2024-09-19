import { Text, View } from "react-native";
import VoiceUI from "./voice_ui";
import React, { useState, useEffect } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';



export default function Index() {
  const [results, setResults] = useState('');

  const handleStartListening = async () => {
    setResults('started listening');
    await timeout(1000);
    setResults(prevResults => prevResults + '...');
  };

  const handleEndListening = () => {
    setResults('stopped listening');
  };

  function timeout(delay: number) {
    return new Promise( res => setTimeout(res, delay) );
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
      <VoiceUI onEndListen={handleEndListening} onStartListen={handleStartListening} results={results}></VoiceUI>
    </GestureHandlerRootView>
  );
  
}
