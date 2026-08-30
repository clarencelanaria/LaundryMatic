// components/AuthButton.jsx
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import Colors from '../constants/colors';

// Props:
// label    — button text
// onPress  — function to call when tapped
// loading  — shows a spinner instead of text when true
// variant  — 'primary' (green) or 'ghost' (outlined)

export default function AuthButton({
  label,
  onPress,
  loading = false, disabled = false,
  variant = 'primary',
}) {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[styles.btn, isPrimary ? styles.primary : styles.ghost,
      isDisabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
      disabled={isDisabled}
    >
      {loading ? (
        // Spinner shown while an async action is running
        <ActivityIndicator color={isPrimary ? '#ffffff' : Colors.accent} />
      ) : (
        <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelGhost]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primary: {
    backgroundColor: Colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  labelPrimary: {
    color: '#ffffff',
  },
  labelGhost: {
    color: Colors.text,
  },
});
