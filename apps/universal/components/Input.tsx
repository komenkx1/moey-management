import { TextInput, View, Text, TextInputProps } from 'react-native';
import { forwardRef } from 'react';

interface InputProps extends TextInputProps {
    label?: string;
    className?: string;
    containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
    ({ label, className, containerClassName, ...props }, ref) => {
        return (
            <View className={`flex flex-col gap-1 ${containerClassName || ''}`}>
                {label && (
                    <Text className="text-sm font-medium text-gray-700">
                        {label}
                    </Text>
                )}
                <TextInput
                    ref={ref}
                    className={`px-4 py-3 border border-gray-300 rounded-lg bg-white text-base ${className || ''}`}
                    placeholderTextColor="#9CA3AF"
                    {...props}
                />
            </View>
        );
    }
);
