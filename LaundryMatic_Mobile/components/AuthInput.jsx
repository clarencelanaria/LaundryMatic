// components/AuthInput.jsx
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Colors from '../constants/colors';
import { Eye, EyeOff } from 'lucide-react-native';

// Props this component accepts:
// label       — the small label above the input (e.g. "Username")
// placeholder — grey hint text inside the input
// value       — the current value (controlled by parent screen)
// onChangeText— function called when user types
// secureText  — true/false: hides characters for passwords
// hint        — optional small text shown below the input

export default function AuthInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureText = false,
  hint,
  keyboardType = 'default',
}) {
  // tracks whether the password is visible or hidden
  const [visible, setVisible] = useState(!secureText);

  return (
    <View style={styles.wrapper}>

      {/* Label above the input */}
      <Text style={styles.label}>{label}</Text>

      {/* Row containing the input + optional eye toggle */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.muted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Only show the eye button if this is a password field */}
        {secureText && (
            <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setVisible(v => !v)}
            >
              {visible
                  ? <EyeOff color={Colors.muted2} size={17} />
                  : <Eye color={Colors.muted2} size={17} />
              }
            </TouchableOpacity>
        )}
      </View>

      {/* Optional hint text below */}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    color: Colors.muted2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',      // put input and eye button side by side
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
  },
  input: {
    flex: 1,                   // takes all width except the eye button
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeIcon: {
    fontSize: 16,
  },
  hint: {
    fontSize: 11,
    color: Colors.muted2,
    marginTop: 5,
  },
});