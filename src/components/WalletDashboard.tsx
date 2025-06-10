import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Text,
  Button,
  Tooltip,
  HStack,
  Icon,
  useColorModeValue,
  ScaleFade,
  Stack,
} from '@chakra-ui/react';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { CheckIcon, CopyIcon, LockIcon, ViewIcon, TriangleUpIcon } from '@chakra-ui/icons';
import { FaWallet } from 'react-icons/fa';
import { ViewSensitiveInfo } from './ViewSensitiveInfo';
import { SendTransaction } from './SendTransaction';

type Page = 'dashboard' | 'send' | 'private';

export const WalletDashboard: React.FC = () => {
  const { balance, address, updateBalance } = useWallet();
  const { logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isCopied, setIsCopied] = useState(false);

  // Fetch balance on mount and set up refresh interval
  useEffect(() => {
    // Initial fetch
    updateBalance();

    // Set up refresh interval (every 30 seconds)
    const intervalId = setInterval(() => {
      updateBalance();
    }, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [updateBalance]);

  // Theme colors
  const bgCard = useColorModeValue('white', 'gray.800');
  const bgInput = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  if (currentPage === 'send') {
    return <SendTransaction onBack={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'private') {
    return <ViewSensitiveInfo onBack={() => setCurrentPage('dashboard')} />;
  }

  return (
    <ScaleFade in={true} initialScale={0.9}>
      <Box p={6} height="100%">
        <VStack spacing={8} align="stretch" height="100%">
          {/* Header with Actions */}
          <HStack justify="space-between" align="center">
            <Text fontSize="xl" fontWeight="semibold" color="gray.700">
              Dashboard
            </Text>
            <Button
              size="sm"
              leftIcon={<LockIcon />}
              onClick={logout}
              variant="ghost"
              colorScheme="brand"
            >
              Lock Wallet
            </Button>
          </HStack>

          {/* Balance Card */}
          <Box
            bg={bgCard}
            p={6}
            borderRadius="xl"
            boxShadow="sm"
            border="1px"
            borderColor={borderColor}
            transition="all 0.2s"
            _hover={{ boxShadow: 'md' }}
          >
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between" align="center">
                <Text fontSize="sm" color="gray.500" fontWeight="medium">
                  Wallet Balance
                </Text>
                <Icon as={FaWallet} color="brand.500" boxSize={5} />
              </HStack>

              <Text fontSize="3xl" fontWeight="bold" color="brand.600">
                {balance.toFixed(2)} DYP
              </Text>

              <Box>
                <Text fontSize="sm" color="gray.500" mb={2}>
                  Wallet Address
                </Text>
                <HStack
                  bg={bgInput}
                  p={3}
                  borderRadius="lg"
                  spacing={2}
                  justify="space-between"
                >
                  <Text fontSize="md" fontWeight="medium" isTruncated>
                    {`${address?.slice(0, 6)}...${address?.slice(-4)}`}
                  </Text>
                  <Tooltip label={isCopied ? 'Copied!' : 'Copy Address'} placement="top">
                    <Box
                      as="button"
                      onClick={() => {
                        navigator.clipboard.writeText(address || '');
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                      p={2}
                      borderRadius="md"
                      _hover={{ bg: 'brand.50' }}
                      transition="all 0.2s"
                    >
                      {isCopied ? (
                        <Icon as={CheckIcon} color="green.500" />
                      ) : (
                        <Icon as={CopyIcon} color="gray.400" />
                      )}
                    </Box>
                  </Tooltip>
                </HStack>
              </Box>
            </VStack>
          </Box>


          <Stack spacing={2} justify="space-between" align="stretch">
            <Button
              colorScheme="brand"
              size="lg"
              width="full"
              onClick={() => setCurrentPage('send')}
              leftIcon={<TriangleUpIcon />}
              _hover={{ transform: 'translateY(-2px)', boxShadow: 'sm' }}
              transition="all 0.2s"
            >
              Send
            </Button>
            <Button
              colorScheme="brand"
              size="lg"
              width="full"
              leftIcon={<ViewIcon />}
              onClick={() => setCurrentPage('private')}
              _hover={{ transform: 'translateY(-2px)', boxShadow: 'sm' }}
              transition="all 0.2s"
            >
              View Private Key
            </Button>
          </Stack>
        </VStack>
      </Box>
    </ScaleFade>
  );
}; 