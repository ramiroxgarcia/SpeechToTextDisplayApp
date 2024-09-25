import { Button, Text, View } from "react-native";
import React, { useState, useEffect } from "react";
import { TextInput } from "react-native-gesture-handler";
import Voice from "@react-native-voice/voice"

export default function VoiceUI({ onStartListen = () => {}, 
                                onEndListen = () => {}, 
                                results = '' as string}) {
    const [isListening, setIsListening] = useState(false);
    const [voiceResults, setVoiceResults] = useState(results);
    
    const toggleListening = () => {
        setIsListening(!isListening);

        // emit start or stop listen event
        if(onStartListen && !isListening) {
            onStartListen();
        }
        else {
            onEndListen();
        }
    };
    // sync prop value
    useEffect(() => {
        setVoiceResults(results);
    }, [results]);

    return (
        <View>
            <TextInput 
            multiline
            style={{width: 400, height: 300, textAlignVertical: 'top', marginBottom: 10}}
            value={voiceResults} 
            onChangeText={setVoiceResults}>     
            </TextInput>
            <View style={{width: 200, margin: "auto"}}>
                <Button title={isListening ? "Stop Listening" : "Start Listening"} 
                onPress={toggleListening}/>
            </View>
        </View>

    );
}