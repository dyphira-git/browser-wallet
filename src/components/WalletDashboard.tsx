import React, { useState, useMemo } from 'react';
import {
  Box,
  VStack,
  Text,
  Input,
  Button,
  useToast,
  Divider,
  Tooltip,
  FormControl,
  FormErrorMessage,
  HStack,
  Icon,
  useColorModeValue,
  ScaleFade,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
} from '@chakra-ui/react';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { CheckIcon, CopyIcon, TriangleUpIcon, LockIcon } from '@chakra-ui/icons';
import { FaWallet } from 'react-icons/fa';

export const WalletDashboard: React.FC = () => {
  const { balance, address, sendTransaction } = useWallet();
  const { logout } = useAuth();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('0.001'); // Default fee
  const [recipientError, setRecipientError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [feeError, setFeeError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const [isCopied, setIsCopied] = useState(false);

  // Theme colors
  const bgCard = useColorModeValue('white', 'gray.800');
  const bgInput = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Calculate total amount including fee
  const total = useMemo(() => {
    const amountNum = parseFloat(amount) || 0;
    const feeNum = parseFloat(fee) || 0;
    return amountNum + feeNum;
  }, [amount, fee]);

  const validateAddress = (address: string): boolean => {
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(address)) {
      setRecipientError('Invalid address. Must be a valid address.');
      return false;
    }
    setRecipientError('');
    return true;
  };

  const validateAmount = (amount: string): boolean => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setAmountError('Amount must be a positive number');
      return false;
    }
    if (numAmount + parseFloat(fee) > balance) {
      setAmountError('Insufficient balance for amount + fee');
      return false;
    }
    setAmountError('');
    return true;
  };

  const validateFee = (fee: string): boolean => {
    const numFee = parseFloat(fee);
    if (isNaN(numFee) || numFee <= 0) {
      setFeeError('Fee must be a positive number');
      return false;
    }
    if (numFee > balance) {
      setFeeError('Insufficient balance for fee');
      return false;
    }
    setFeeError('');
    return true;
  };

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRecipient(value);
    if (value) validateAddress(value);
    else setRecipientError('');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    if (value) {
      validateAmount(value);
      // Revalidate fee when amount changes
      if (fee) validateFee(fee);
    } else {
      setAmountError('');
    }
  };

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFee(value);
    if (value) {
      validateFee(value);
      // Revalidate amount when fee changes
      if (amount) validateAmount(amount);
    } else {
      setFeeError('');
    }
  };

  const handleSendTransaction = async () => {
    const isAddressValid = validateAddress(recipient);
    const isAmountValid = validateAmount(amount);
    const isFeeValid = validateFee(fee);

    if (!isAddressValid || !isAmountValid || !isFeeValid) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendTransaction(recipient, amount, fee);
      toast({
        title: 'Transaction Sent',
        description: `Transaction hash: ${result.hash}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      setRecipient('');
      setAmount('');
      setFee('0.001');
      setRecipientError('');
      setAmountError('');
      setFeeError('');
    } catch (error) {
      toast({
        title: 'Transaction Failed',
        description: error instanceof Error ? error.message : 'Failed to send transaction',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScaleFade in={true} initialScale={0.9}>
      <Box p={6} height="100%">
        <VStack spacing={8} align="stretch" height="100%">
          {/* Header with Logout */}
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

          <Divider />

          {/* Send Transaction Form */}
          <Box>
            <Text fontSize="xl" fontWeight="semibold" mb={6} color="gray.700">
              Send Transaction
            </Text>
            <VStack spacing={6}>
              <FormControl isInvalid={!!recipientError}>
                <Input
                  placeholder="Recipient Address"
                  value={recipient}
                  onChange={handleRecipientChange}
                  size="md"
                  bg={bgInput}
                  borderColor={borderColor}
                  _hover={{ borderColor: 'brand.300' }}
                  _focus={{ borderColor: 'brand.500', boxShadow: 'none' }}
                />
                <FormErrorMessage>{recipientError}</FormErrorMessage>
              </FormControl>

              <HStack width="100%" spacing={4} align="flex-start">
                <FormControl isInvalid={!!amountError}>
                  <Input
                    placeholder="Amount"
                    value={amount}
                    onChange={handleAmountChange}
                    type="number"
                    step="0.01"
                    size="md"
                    bg={bgInput}
                    borderColor={borderColor}
                    _hover={{ borderColor: 'brand.300' }}
                    _focus={{ borderColor: 'brand.500', boxShadow: 'none' }}
                  />
                  <FormErrorMessage>{amountError}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!feeError} width="150px">
                  <Input
                    placeholder="Fee"
                    value={fee}
                    onChange={handleFeeChange}
                    type="number"
                    step="0.001"
                    size="md"
                    bg={bgInput}
                    borderColor={borderColor}
                    _hover={{ borderColor: 'brand.300' }}
                    _focus={{ borderColor: 'brand.500', boxShadow: 'none' }}
                  />
                  <FormErrorMessage>{feeError}</FormErrorMessage>
                </FormControl>
              </HStack>

              <Box 
                p={4} 
                bg={bgInput} 
                borderRadius="md" 
                width="100%"
                borderWidth="1px"
                borderColor={borderColor}
              >
                <StatGroup>
                  <Stat>
                    <StatLabel color="gray.500">Amount</StatLabel>
                    <StatNumber fontSize="md">{parseFloat(amount || '0').toFixed(3)} DYP</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel color="gray.500">Fee</StatLabel>
                    <StatNumber fontSize="md">{parseFloat(fee || '0').toFixed(3)} DYP</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel color="gray.500">Total</StatLabel>
                    <StatNumber fontSize="md" color="brand.500">{total.toFixed(3)} DYP</StatNumber>
                  </Stat>
                </StatGroup>
              </Box>

              <Button
                colorScheme="brand"
                width="full"
                onClick={handleSendTransaction}
                isDisabled={!recipient || !amount || !fee || !!recipientError || !!amountError || !!feeError}
                size="md"
                isLoading={isLoading}
                loadingText="Sending..."
                leftIcon={<TriangleUpIcon />}
                _hover={{ transform: 'translateY(-2px)', boxShadow: 'sm' }}
                transition="all 0.2s"
              >
                Send
              </Button>
            </VStack>
          </Box>
        </VStack>
      </Box>
    </ScaleFade>
  );
}; 