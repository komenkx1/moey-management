import { Pressable, Text, ActivityIndicator, PressableProps } from 'react-native';

interface ButtonProps extends PressableProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    loading?: boolean;
    className?: string;
    textClassName?: string;
}

export function Button({
    onPress,
    children,
    variant = 'primary',
    disabled,
    loading,
    className = '',
    textClassName = '',
    ...props
}: ButtonProps) {
    const variantStyles = {
        primary: 'bg-brand',
        secondary: 'bg-gray-200',
        danger: 'bg-red-500',
        ghost: 'bg-transparent'
    };

    const textStyles = {
        primary: 'text-white',
        secondary: 'text-gray-900',
        danger: 'text-white',
        ghost: 'text-brand'
    };

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            className={`px-4 py-3 rounded-lg items-center justify-center flex-row gap-2 ${variantStyles[variant]} ${disabled ? 'opacity-50' : ''} ${className}`}
            {...props}
        >
            {loading && (
                <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? '#2563EB' : '#fff'} />
            )}
            <Text className={`font-semibold ${textStyles[variant]} ${textClassName}`}>
                {children}
            </Text>
        </Pressable>
    );
}
