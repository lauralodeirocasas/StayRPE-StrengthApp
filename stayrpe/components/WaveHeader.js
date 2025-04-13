import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, Path, Use, G } from 'react-native-svg';
import { LinearGradient as RNLinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedProps,
    withTiming,
    withRepeat,
    Easing,
    useAnimatedStyle,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function WaveHeader() {
    const translateX = useSharedValue(0);

    useEffect(() => {
        translateX.value = withRepeat(
            withTiming(-85, {
                duration: 6000,
                easing: Easing.linear,
            }),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    return (
        <View style={styles.container}>
            <RNLinearGradient
                colors={['#d5b4d5', '#ffe9d1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBackground}
            />

            <Svg
                style={styles.waves}
                viewBox="0 24 150 28"
                preserveAspectRatio="none"
                shapeRendering="auto"
            >
                <Defs>
                    <Path
                        id="gentle-wave"
                        d="M-160 44c30 0 58-18 88-18s58 18 88 18 58-18 88-18 58 18 88 18v44h-352z"
                    />
                    <Path
                        id="gentle-wave-alt"
                        d="M-160 40c30 0 58-14 88-14s58 14 88 14 58-14 88-14 58 14 88 14v44h-352z"
                    />
                    <Path
                        id="gentle-wave-alt2"
                        d="M-160 38c30 0 58-12 88-12s58 12 88 12 58-12 88-12 58 12 88 12v44h-352z"
                    />
                </Defs>
                <G style={animatedStyle}>
                    <Use href="#gentle-wave-alt2" x="48" y="0" fill="rgba(255,255,255,0.3)" />
                    <Use href="#gentle-wave-alt" x="48" y="2" fill="rgba(255,255,255,0.5)" />
                    
                    <Use href="#gentle-wave" x="48" y="6" fill="#f1f1f1" />
                </G>
            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        height: 300,
    },
    gradientBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    waves: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: 100,
        minHeight: 80,
        maxHeight: 100,
    },
});
