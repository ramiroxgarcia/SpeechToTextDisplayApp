import { Text, View } from "react-native";
import VoiceUI from "./voice_ui";
import React, { useState, useEffect } from "react";


export default function Index() {
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
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <VoiceUI onEndListen={handleEndListening} onStartListen={handleStartListening} results={results}></VoiceUI>
    </View>
  );
}
