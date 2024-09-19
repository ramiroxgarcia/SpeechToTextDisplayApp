import { Button, Text, View, StyleSheet, Pressable } from "react-native";
import React, { useState, useEffect } from "react";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { TextInput } from "react-native-gesture-handler";

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

    const styles = StyleSheet.create({
        buittonm: {
            backgroundColor: '#000000',
            borderColor: '#1A1A1A',
            borderWidth: 2,
            borderRadius: 15,
            paddingVertical: 16,
            paddingHorizontal: 24,
            width: '100%',
            minHeight: 60,
            justifyContent: 'center',
            alignItems: 'center',
            shadowOpacity: 1,
            shadowRadius: 10,
            elevation: 5,
        },
        text: {
            fontSize: 16,
            fontWeight: '600',
            color: 'white',
            textAlign: 'center',
        },
        textInput: {
            width: 400,
            height: 300,
            textAlignVertical: 'top',
            marginBottom: 20,
            borderColor: '#1A1A1A',
            borderWidth: 1,
            borderRadius: 10,
            shadowOpacity: 1,
            shadowRadius: 5,
            padding: 10,
        }
    });

    return (
        <View>
            <TextInput 
            editable={false}
            selectTextOnFocus={false}
            multiline
            style={styles.textInput}
            value={voiceResults} 
            onChangeText={setVoiceResults}>     
            </TextInput>
            <View style={{width: 200, margin: "auto"}}>
                <Pressable  
                style={[styles.buittonm]}
                onPress={toggleListening}>
                    <Text style={[styles.text]}>{isListening ? "Stop Listening" : "Start Listening"}</Text>
                </Pressable>
            </View>
        </View>

    );
    
}