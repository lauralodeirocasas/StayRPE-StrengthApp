import { StyleSheet, Text, TextInput, View } from "react-native";
import Svg from "react-native-svg";
import WaveHeader from "../components/WaveHeader.js";
import GradientButton from '../components/GradientButton';


export default function Login(){
    return (
        <View style={styles.container}>
            <WaveHeader/>
            <Text style={styles.title}>Hello</Text>
            <Text style={styles.subTitle}>Sing In to your account</Text>
            <TextInput style={styles.input} placeholder="stayrpe@email.com"/>
            <TextInput style={styles.input} placeholder="Password" secureTextEntry={true}/>
            <GradientButton
                title="Sign In"
                onPress={() => console.log('Pulsado')}
                style={{ width: '150', marginTop: 30 }}
                />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f1f1f1",
        paddingTop: 120 
    },
    title:{
        fontSize: 80,
        fontWeight: "bold",
        color:"#34434D",
    },
    subTitle:{
        fontSize: 20,
        color:"gray"

    },
    input:{
        paddingStart: 30,
        padding: 10,
        width: "80%",
        height: 50,
        marginTop: 20,
        borderRadius:30,
        backgroundColor: "#fff",

    },
    button:{
        alignItems: "center",
    }

})