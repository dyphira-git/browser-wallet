import React, { useState, useMemo } from 'react';
import {
  Box,
  VStack,
  Text,
  Input,
  Button,
  useToast,
  FormControl,
  FormErrorMessage,
  HStack,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  IconButton,
} from '@chakra-ui/react';
import { useWallet } from '../context/WalletContext';
import { ArrowBackIcon, TriangleUpIcon } from '@chakra-ui/icons';

interface SendTransactionProps {
  onBack: () => void;
}

export const SendTransaction: React.FC<SendTransactionProps> = ({ onBack }) => {
  const { balance, sendTransaction } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('0.001'); // Default fee
  const [recipientError, setRecipientError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [feeError, setFeeError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  // Theme colors
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
      onBack(); // Return to dashboard after successful transaction
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
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" align="center">
          <IconButton
            aria-label="Back to dashboard"
            icon={<ArrowBackIcon />}
            variant="ghost"
            onClick={onBack}
          />
          <Text fontSize="xl" fontWeight="semibold" color="gray.700">
            Send Transaction
          </Text>
          <Box width="40px" /> {/* Spacer for alignment */}
        </HStack>

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
  );
}; 