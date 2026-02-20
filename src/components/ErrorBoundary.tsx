/**
 * Error Boundary component for catching render errors
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Surface style={styles.card} elevation={2}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={64}
              color={COLORS.error}
            />
            <Text variant="headlineSmall" style={styles.title}>
              Something went wrong
            </Text>
            <Text variant="bodyMedium" style={styles.message}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Text>
            <Button
              mode="contained"
              onPress={this.handleReset}
              style={styles.button}
            >
              Try Again
            </Button>
          </Surface>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  card: {
    padding: 32,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  title: {
    marginTop: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  message: {
    marginTop: 8,
    textAlign: 'center',
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  button: {
    marginTop: 24,
    borderRadius: RADIUS.md,
  },
});
