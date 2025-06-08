import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login, hasPassword, setInitialPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasPassword) {
      if (password !== confirmPassword) {
        toast({
          title: 'Error',
          description: 'Passwords do not match',
          status: 'error',
          duration: 3000,
        });
        return;
      }
      if (password.length < 8) {
        toast({
          title: 'Error',
          description: 'Password must be at least 8 characters long',
          status: 'error',
          duration: 3000,
        });
        return;
      }
      await setInitialPassword(password);
      toast({
        title: 'Success',
        description: 'Password set successfully',
        status: 'success',
        duration: 3000,
      });
    } else {
      const success = await login(password);
      if (!success) {
        toast({
          title: 'Error',
          description: 'Invalid password',
          status: 'error',
          duration: 3000,
        });
      }
    }
  };

  return (
    <Box p={8}>
      <form onSubmit={handleSubmit}>
        <VStack spacing={4}>
          <Text fontSize="xl" fontWeight="bold">
            {hasPassword ? 'Enter Password' : 'Set Password'}
          </Text>
          <FormControl>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </FormControl>
          {!hasPassword && (
            <FormControl>
              <FormLabel>Confirm Password</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </FormControl>
          )}
          <Button type="submit" colorScheme="brand" width="100%">
            {hasPassword ? 'Login' : 'Set Password'}
          </Button>
        </VStack>
      </form>
    </Box>
  );
}; 