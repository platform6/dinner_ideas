import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Center,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Stack,
  Text,
} from '@chakra-ui/react';

import { useAuth } from '@/features/auth/useAuth';
import { uiIcons } from '@/shared/components/icons';

export function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError('Couldn’t log in. Check your email and password and try again.');
      }
    } catch {
      // signIn only resolves with { error } for auth failures; this catches everything
      // else (e.g. a network failure), which would otherwise leave no error shown at all.
      setError('Couldn’t log in. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Flex minH={{ md: '100vh' }} align={{ md: 'center' }} justify="center">
      <Box maxW="sm" w="full" mx="auto" mt={{ base: 12, md: 0 }} px={{ base: 5, md: 4 }}>
        <Center flexDirection="column" mb={6}>
          <Center w="60px" h="60px" borderRadius="control" bg="brand.100" color="brand.500" mb={3}>
            <uiIcons.logo size={30} strokeWidth={1.8} />
          </Center>
          <Heading textStyle="pageTitle" fontSize="2rem" textAlign="center">
            Dinner Ideas
          </Heading>
          <Text fontSize="14px" color="ink.400" mt={1}>
            Three dinners, one shopping list.
          </Text>
        </Center>

        <Box as="form" onSubmit={handleSubmit}>
          <Stack gap={4}>
            {error && (
              <Alert layerStyle="notice">
                <uiIcons.info size={16} strokeWidth={2} style={{ flexShrink: 0, marginRight: '8px' }} />
                {error}
              </Alert>
            )}
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <InputGroup>
                <InputLeftElement pointerEvents="none" color="ink.400">
                  <uiIcons.email size={16} strokeWidth={1.8} />
                </InputLeftElement>
                <Input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </InputGroup>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Password</FormLabel>
              <InputGroup>
                <InputLeftElement pointerEvents="none" color="ink.400">
                  <uiIcons.password size={16} strokeWidth={1.8} />
                </InputLeftElement>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <InputRightElement>
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    icon={
                      showPassword ? (
                        <uiIcons.hidePassword size={16} strokeWidth={1.8} />
                      ) : (
                        <uiIcons.reveal size={16} strokeWidth={1.8} />
                      )
                    }
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword((prev) => !prev)}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>
            <Button
              type="submit"
              size="lg"
              width="full"
              isLoading={isSubmitting}
              rightIcon={<uiIcons.forward size={16} strokeWidth={2} />}
            >
              Log in
            </Button>
          </Stack>
        </Box>
      </Box>
    </Flex>
  );
}
