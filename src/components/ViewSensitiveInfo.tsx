import React, { useState } from 'react';
import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  useToast,
  HStack,
  IconButton,
} from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { CopyIcon, ArrowBackIcon } from '@chakra-ui/icons';

interface ViewSensitiveInfoProps {
  onBack: () => void;
}

export const ViewSensitiveInfo: React.FC<ViewSensitiveInfoProps> = ({ onBack }) => {
  const [password, setPassword] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const { login } = useAuth();
  const { mnemonic, privateKey } = useWallet();
  const toast = useToast();

  const handleVerifyPassword = async () => {
    try {
      const isValid = await login(password);
      if (isValid) {
        setIsVerified(true);
      } else {
        toast({
          title: 'Error',
          description: 'Invalid password',
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify password',
        status: 'error',
        duration: 3000,
      });
    }
    setPassword('');
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${type} has been copied to clipboard`,
      status: 'success',
      duration: 2000,
    });
  };

  const handleClose = () => {
    setIsVerified(false);
    setPassword('');
    onBack();
  };

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" align="center">
          <IconButton
            aria-label="Back to dashboard"
            icon={<ArrowBackIcon />}
            variant="ghost"
            onClick={handleClose}
          />
          <Text fontSize="xl" fontWeight="semibold" color="gray.700">
            View Private Information
          </Text>
          <Box width="40px" /> {/* Spacer for alignment */}
        </HStack>

        {!isVerified ? (
          <VStack spacing={4}>
            <Text>Please enter your password to view sensitive information</Text>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              colorScheme="brand"
              onClick={handleVerifyPassword}
              isDisabled={!password}
              width="full"
            >
              Verify Password
            </Button>
          </VStack>
        ) : (
          <VStack spacing={6} align="stretch">
            <Box>
              <Text fontWeight="bold" mb={2}>Private Key</Text>
              <HStack>
                <Input
                  value={privateKey}
                  isReadOnly
                  bg="gray.50"
                  pr="2.5rem"
                />
                <IconButton
                  aria-label="Copy private key"
                  icon={<CopyIcon />}
                  onClick={() => handleCopy(privateKey, 'Private key')}
                />
              </HStack>
            </Box>
            
            <Box>
              <Text fontWeight="bold" mb={2}>Recovery Phrase</Text>
              <VStack align="stretch" spacing={2}>
                <Box
                  p={4}
                  bg="gray.50"
                  borderRadius="md"
                  position="relative"
                >
                  <Text wordBreak="break-word">
                    {mnemonic.join(' ')}
                  </Text>
                </Box>
                <Button
                  size="sm"
                  onClick={() => handleCopy(mnemonic.join(' '), 'Recovery phrase')}
                  leftIcon={<CopyIcon />}
                >
                  Copy Recovery Phrase
                </Button>
              </VStack>
            </Box>
          </VStack>
        )}
      </VStack>
    </Box>
  );
}; 